<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductCategoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'imageUrl' => $this->image_url,
            'active' => (bool) $this->active,
            // ── Two-level hierarchy ──────────────────────────────────
            // parentId is null for a top-level category and points at the
            // owning parent category for a subcategory.
            'parentId' => $this->parent_id,
            'isSubcategory' => $this->parent_id !== null,
            'parent' => $this->whenLoaded('parent', fn () => new self($this->parent)),
            'children' => self::collection($this->whenLoaded('children')),
            'productCount' => $this->whenCounted('products'),
            'subcategoryCount' => $this->whenCounted('children'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
