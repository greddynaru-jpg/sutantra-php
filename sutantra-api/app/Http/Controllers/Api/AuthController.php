<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ProfileRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\VerificationCodeRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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

        $registered = User::where('email', $identifier)->orWhere('phone', $identifier)->exists();

        if (! $registered) {
            throw ValidationException::withMessages([
                'identifier' => ['No account was found for that phone number or email address.'],
            ]);
        }

        return response()->json([
            'message' => 'Verification code requested.',
        ]);
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