<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $id = $this->user()?->id;

        return [
            'name' => ['nullable', 'string', 'max:150'],
            'email' => ['required', 'email:rfc', 'max:100', Rule::unique('users', 'email')->ignore($id)],
            'phone' => ['required', 'string', 'max:15', 'regex:/^[0-9+\-\s]{7,15}$/', Rule::unique('users', 'phone')->ignore($id)],
            'password' => ['sometimes', 'nullable', 'string', 'min:8', 'confirmed'],
        ];
    }
}