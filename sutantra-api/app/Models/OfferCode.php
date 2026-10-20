<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A storefront discount offer code (Phase 1: managed from the admin area).
 *
 * Codes are stored upper-cased so the unique index enforces case-insensitive
 * uniqueness on every database driver. `used_count` is reserved for the later
 * redemption phase and is never written by the admin endpoints.
 */
class OfferCode extends Model
{
    use HasFactory;

    public const TYPE_PERCENTAGE = 'PERCENTAGE';

    public const TYPE_FIXED = 'FIXED';

    protected $fillable = [
        'code',
        'description',
        'discount_type',
        'discount_value',
        'min_order_amount',
        'max_discount',
        'starts_at',
        'expires_at',
        'usage_limit',
        'per_customer_limit',
        'used_count',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'discount_value' => 'decimal:2',
            'min_order_amount' => 'decimal:2',
            'max_discount' => 'decimal:2',
            'starts_at' => 'date',
            'expires_at' => 'date',
            'usage_limit' => 'integer',
            'per_customer_limit' => 'integer',
            'used_count' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
