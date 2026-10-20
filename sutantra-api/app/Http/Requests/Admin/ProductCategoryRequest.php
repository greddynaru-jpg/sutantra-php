<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\ValidatesImages;
use App\Models\ProductCategory;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductCategoryRequest extends FormRequest
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
        $category = $this->route('category');

        return [
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('product_categories', 'name')->ignore($category?->id),
            ],
            'description' => ['nullable', 'string', 'max:255'],
            'active' => ['sometimes', 'boolean'],
            // A parent is optional (NULL = top-level). When present it must be an
            // existing, top-level category; subcategories cannot own children and
            // a category can never be its own parent.
            'parent_id' => [
                'nullable',
                'integer',
                function (string $attribute, mixed $value, \Closure $fail) use ($category): void {
                    if ($value === null || $value === '') {
                        return;
                    }

                    $parent = ProductCategory::query()->find($value);

                    if ($parent === null) {
                        $fail('The selected parent category does not exist.');

                        return;
                    }

                    if ($category !== null && (int) $parent->id === (int) $category->id) {
                        $fail('A category cannot be its own parent.');

                        return;
                    }

                    if ($parent->parent_id !== null) {
                        $fail('A subcategory cannot be the parent of another category.');
                    }
                },
            ],
            'image' => $this->imageRules(),
            'remove_image' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Cross-field checks that need the persisted category: a category that
     * already owns subcategories may not itself be turned into a subcategory.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $category = $this->route('category');

            if ($category === null || ! $this->filled('parent_id')) {
                return;
            }

            if ($category->children()->exists()) {
                $validator->errors()->add(
                    'parent_id',
                    'This category has subcategories and cannot become a subcategory itself.'
                );
            }
        });
    }
}
