<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\ValidatesImages;
use Illuminate\Foundation\Http\FormRequest;

class ProductRequest extends FormRequest
{
    use ValidatesImages;

    /**
     * Authorization is handled by the route middleware (auth:sanctum + role).
     */
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
            'description' => ['nullable', 'string', 'max:500'],
            'category_id' => ['required', 'integer', 'exists:product_categories,id'],
            'price' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'unit' => ['nullable', 'string', 'max:50'],
            'available' => ['sometimes', 'boolean'],
            'stock_quantity' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'image' => $this->imageRules(),
            'remove_image' => ['sometimes', 'boolean'],
        ];
    }
}
