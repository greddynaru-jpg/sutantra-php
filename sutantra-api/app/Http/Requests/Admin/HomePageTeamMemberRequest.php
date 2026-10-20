<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\ValidatesImages;
use Illuminate\Foundation\Http\FormRequest;

class HomePageTeamMemberRequest extends FormRequest
{
    use ValidatesImages;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'role' => ['required', 'string', 'max:150'],
            'about' => ['nullable', 'string', 'max:100000'],
            'message' => ['nullable', 'string', 'max:100000'],
            'photo' => $this->imageRules(false),
            'remove_photo' => ['sometimes', 'boolean'],
            'active' => ['sometimes', 'boolean'],
            'display_order' => ['sometimes', 'integer', 'min:0', 'max:100000'],
        ];
    }
}
