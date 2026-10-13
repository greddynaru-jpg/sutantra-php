<?php

namespace App\Http\Requests\Admin\Concerns;

/**
 * Shared image validation rules sourced from config/uploads.php so the allowed
 * types and maximum size stay in one place (backend + frontend contract).
 */
trait ValidatesImages
{
    /**
     * @return array<int, string>
     */
    protected function imageRules(bool $required = false): array
    {
        $types = (array) config('uploads.allowed_types', ['jpg', 'jpeg', 'png', 'webp', 'gif']);
        $maxKb = (int) config('uploads.max_size_kb', 5120);

        return [
            $required ? 'required' : 'nullable',
            'image',
            'mimes:'.implode(',', $types),
            'max:'.$maxKb,
        ];
    }
}
