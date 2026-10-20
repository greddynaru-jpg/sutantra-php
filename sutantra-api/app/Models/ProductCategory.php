<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductCategory extends Model
{
    use HasFactory;

    protected $fillable = ['parent_id', 'name', 'description', 'active', 'image_url'];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'parent_id' => 'integer',
        ];
    }

    /**
     * The parent category. Present only for subcategories (parent_id is NULL
     * for top-level categories).
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /**
     * Direct subcategories. The hierarchy is limited to two levels, so a
     * subcategory never has children of its own.
     */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'category_id');
    }

    /**
     * True when this category is a top-level (parent) category.
     */
    public function isParent(): bool
    {
        return $this->parent_id === null;
    }

    /**
     * True when this category belongs to a parent category.
     */
    public function isSubcategory(): bool
    {
        return $this->parent_id !== null;
    }

    /**
     * Limit a query to top-level (parent) categories.
     */
    public function scopeParents(Builder $query): Builder
    {
        return $query->whereNull('parent_id');
    }
}
