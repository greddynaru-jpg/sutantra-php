<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\ValidatesImages;
use Illuminate\Foundation\Http\FormRequest;

class HomePageLogoRequest extends FormRequest
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
        // The logo is always replaced by a newly uploaded image.
        return [
            'image' => $this->imageRules(true),
        ];
    }
}
