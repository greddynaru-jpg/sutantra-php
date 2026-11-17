<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ProfileRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\VerificationCodeRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\UserOtpVerification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Password-only login that accepts a registered email OR phone number.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $identifier = trim($request->string('identifier'));
        $password = $request->string('password');

        $user = User::where('email', $identifier)->orWhere('phone', $identifier)->first();

        if ($user === null || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'identifier' => ['The provided credentials do not match any registered account.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'identifier' => ['This account has been disabled. Please contact support.'],
            ]);
        }

        $token = $user->createToken('sutantra-web')->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Step 1 of the login flow ("Get Verification Code"). Validates that the
     * identifier belongs to a registered account and lets the frontend advance
     * to the credential screen. No code is generated or sent, and unknown
     * identifiers are never auto-registered — genuine OTP delivery (e.g.
     * WhatsApp) will replace this step later. The credential itself is still
     * verified by login() against the stored password hash.
     */
    public function requestVerificationCode(VerificationCodeRequest $request): JsonResponse
    {
        $identifier = trim($request->string('identifier'));

        $user = User::where('email', $identifier)->orWhere('phone', $identifier)->first();

        if ($user === null) {
            throw ValidationException::withMessages([
                'identifier' => ['No account was found for that phone number or email address.'],
            ]);
        }

        // OTP generation (kept within existing flow). Generated here for WhatsApp delivery.
        $otp = (string) random_int(100000, 999999);

        UserOtpVerification::updateOrCreate(
            ['user_id' => $user->id],
            [
                'verification_code' => Hash::make($otp),
                'expires_at' => now()->addMinute(),
                'is_verified' => false,
                'attempts' => 0,
            ]
        );

        $this->sendVerificationCodeWhatsApp($user, $otp);

        return response()->json([
            'message' => 'Verification code requested.',
        ]);
    }

    /**
     * Verify WhatsApp OTP and authenticate the user (Sanctum token).
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'identifier' => ['required', 'string', 'max:191'],
            'verification_code' => ['required', 'string'],
        ]);

        $identifier = trim((string) $validated['identifier']);
        $code = trim((string) $validated['verification_code']);

        $user = User::where('email', $identifier)->orWhere('phone', $identifier)->first();

        if ($user === null) {
            throw ValidationException::withMessages([
                'identifier' => ['The provided credentials do not match any registered account.'],
            ]);
        }

        return DB::transaction(function () use ($user, $code): JsonResponse {
            $otpRecord = UserOtpVerification::where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if ($otpRecord === null) {
                throw ValidationException::withMessages([
                    'verification_code' => ['No verification code was found. Please request a new code.'],
                ]);
            }

            if ($otpRecord->is_verified) {
                throw ValidationException::withMessages([
                    'verification_code' => ['This verification code has already been used. Please request a new code.'],
                ]);
            }

            if ($otpRecord->expires_at === null || $otpRecord->expires_at->isPast()) {
                throw ValidationException::withMessages([
                    'verification_code' => ['The verification code has expired. Please request a new code.'],
                ]);
            }

            if ($otpRecord->attempts >= 5) {
                throw ValidationException::withMessages([
                    'verification_code' => ['Too many incorrect attempts. Please request a new code.'],
                ]);
            }

            if (! Hash::check($code, $otpRecord->verification_code)) {
                $otpRecord->attempts = (int) $otpRecord->attempts + 1;
                $otpRecord->save();

                throw ValidationException::withMessages([
                    'verification_code' => ['The verification code is incorrect.'],
                ]);
            }

            if (! $user->is_active) {
                throw ValidationException::withMessages([
                    'identifier' => ['This account has been disabled. Please contact support.'],
                ]);
            }

            $otpRecord->is_verified = true;
            $otpRecord->save();

            $token = $user->createToken('sutantra-web')->plainTextToken;

            return response()->json([
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => new UserResource($user),
            ]);
        });
    }

    /**
     * Send the generated verification code via configured WhatsApp API.
     * OTP is always sent to the registered mobile number from the database.
     * Failures are handled safely (no credentials/OTP exposure, no response leak).
     */
    private function sendVerificationCodeWhatsApp(User $user, string $otp): void
    {
        try {
            $phone = preg_replace('/\D+/', '', (string) ($user->phone ?? ''));
            if ($phone === '') {
                Log::warning('WhatsApp verification code not sent: account has no registered mobile number.');
                return;
            }

            // Normalize to WhatsApp recipient format (default India country code for 10-digit local numbers).
            if (strlen($phone) === 10) {
                $phone = '91' . $phone;
            } elseif (strlen($phone) === 12 && str_starts_with($phone, '91')) {
                // already in expected format
            }

            $phoneNumberId = (string) env('WHATSAPP_PHONE_NUMBER_ID', '');
            $apiKey = (string) env('WHATSAPP_API_KEY', env('WHATSAPP_ACCESS_TOKEN', ''));
            $serviceUrl = (string) env('WHATSAPP_SERVICE_URL', '');
            $templateName = (string) env('WHATSAPP_TEMPLATE_NAME', 'sutantra_otp');
            $templateLang = (string) env('WHATSAPP_TEMPLATE_LANGUAGE', 'en');

            // Ensure approved template is used.
            if ($templateName === '' || $templateName === 'ysutantra_otp') {
                $templateName = 'sutantra_otp';
            }
            if ($templateLang === '') {
                $templateLang = 'en';
            }

            if ($phoneNumberId === '' || $apiKey === '' || $serviceUrl === '') {
                Log::warning('WhatsApp verification code not sent: missing configuration.');
                return;
            }

            // Endpoint: POST {WHATSAPP_SERVICE_URL}/v3/{WHATSAPP_PHONE_NUMBER_ID}/messages
            // Supports full URL in env or a base URL that needs the /v3/{id}/messages path.
            $baseUrl = rtrim($serviceUrl, '/');
            $url = str_replace('{{phone_number_id}}', $phoneNumberId, $baseUrl);
            if (! str_contains($url, '/messages')) {
                $url = rtrim($url, '/') . '/v3/' . $phoneNumberId . '/messages';
            } elseif (! str_contains($baseUrl, '{{phone_number_id}}') && ! preg_match('#/v3/' . preg_quote($phoneNumberId, '#') . '/messages$#', $url)) {
                $url = rtrim($baseUrl, '/') . '/v3/' . $phoneNumberId . '/messages';
            }

            // Authentication OTP Copy code template payload (button uses URL-type auth format).
            $payload = [
                'messaging_product' => 'whatsapp',
                'to' => $phone,
                'type' => 'template',
                'template' => [
                    'name' => $templateName,
                    'language' => ['code' => $templateLang],
                    'components' => [
                        [
                            'type' => 'body',
                            'parameters' => [
                                ['type' => 'text', 'text' => $otp],
                            ],
                        ],
                        [
                            'type' => 'button',
                            'sub_type' => 'url',
                            'index' => '0',
                            'parameters' => [
                                ['type' => 'text', 'text' => $otp],
                            ],
                        ],
                    ],
                ],
            ];

            $response = Http::timeout(15)
                ->withHeaders([
                    'apikey' => $apiKey,
                    'Content-Type' => 'application/json',
                ])
                ->acceptJson()
                ->post($url, $payload);

            $safeBody = preg_replace('/\s+/', ' ', (string) $response->body());
            $safeBody = mb_substr($safeBody ?? '', 0, 500);

            if ($response->successful()) {
                Log::info('WhatsApp verification code send submitted.', [
                    'status' => $response->status(),
                    'host' => parse_url($url, PHP_URL_HOST),
                ]);
            } else {
                Log::warning('WhatsApp verification code send failed.', [
                    'status' => $response->status(),
                    'host' => parse_url($url, PHP_URL_HOST),
                    'body' => $safeBody,
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('WhatsApp verification code send exception.', [
                'type' => get_class($e),
                'message' => mb_substr((string) $e->getMessage(), 0, 300),
            ]);
        }
    }

    /**
     * Public self-registration. Always creates a USER role; ADMIN / SUPER_ADMIN
     * accounts can only be created by an existing administrator.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->input('name'),
            'email' => $request->string('email')->lower(),
            'phone' => $request->string('phone'),
            'password' => $request->string('password'),
            'role' => User::ROLE_USER,
            'is_active' => true,
        ]);

        $token = $user->createToken('sutantra-web')->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => new UserResource($user),
        ], 201);
    }

    /**
     * Current authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => new UserResource($request->user())]);
    }

    /**
     * Update name / email / phone, and optionally the password.
     *
     * Password permissions: an ADMIN account may never change its own password.
     * Administrators' passwords are only ever set by a SUPER_ADMIN through the
     * user-management workflow (`/api/admin/users`), so hiding the field in the
     * UI is not enough — the restriction is enforced here as well.
     */
    public function updateProfile(ProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($request->filled('password') && $user->role === User::ROLE_ADMIN) {
            return response()->json([
                'message' => 'Administrators cannot change their own password. Ask a super administrator to set it for you.',
            ], 403);
        }

        $user->forceFill([
            'name' => $request->input('name'),
            'email' => $request->string('email')->lower(),
            'phone' => $request->string('phone'),
        ]);

        if ($request->filled('password')) {
            $user->password = $request->string('password');
        }

        $user->save();

        return response()->json(['user' => new UserResource($user->fresh())]);
    }

    /**
     * Logout: revoke the current bearer token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }
}