<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->route('user');
        $creating = $user === null;

        return [
            'name' => ['nullable', 'string', 'max:150'],
            'email' => [
                'required',
                'email',
                'max:150',
                Rule::unique('users', 'email')->ignore($user?->id),
            ],
            'phone' => [
                'required',
                'string',
                'max:15',
                Rule::unique('users', 'phone')->ignore($user?->id),
            ],
            'password' => [
                $creating ? 'required' : 'nullable',
                'string',
                'min:6',
                'max:72',
            ],
            'role' => [
                'required',
                Rule::in([User::ROLE_USER, User::ROLE_ADMIN, User::ROLE_SUPER_ADMIN]),
            ],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
