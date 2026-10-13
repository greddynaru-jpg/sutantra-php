<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\ValidatesImages;
use Illuminate\Foundation\Http\FormRequest;

class HomePageBannerRequest extends FormRequest
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
        // A banner image is required when creating, optional when updating.
        $creating = $this->route('banner') === null;

        return [
            'title' => ['nullable', 'string', 'max:150'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'image' => $this->imageRules($creating),
            'target_url' => ['nullable', 'string', 'max:500'],
            'active' => ['sometimes', 'boolean'],
            'display_order' => ['sometimes', 'integer', 'min:0', 'max:100000'],
        ];
    }
}
