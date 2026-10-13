<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Step 1 of the two-step login flow: the "Get Verification Code" request.
 *
 * Only the identifier (registered email OR phone) is validated here. No code is
 * generated or sent — WhatsApp / OTP delivery will be added in a later phase,
 * and this request is where that logic will live.
 */
class VerificationCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'identifier' => ['required', 'string', 'max:191'],
        ];
    }
}
