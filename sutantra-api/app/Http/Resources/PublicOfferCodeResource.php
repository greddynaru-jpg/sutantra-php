<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Customer-facing projection of an offer code.
 *
 * Deliberately narrow: the homepage only needs the public redemption details.
 * Administrative fields (id, used_count, usage_limit, per_customer_limit,
 * is_active, timestamps) are never exposed here.
 */
class PublicOfferCodeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'code' => $this->code,
            'description' => $this->description,
            'discountType' => $this->discount_type,
            'discountValue' => (float) $this->discount_value,
            'minOrderAmount' => (float) $this->min_order_amount,
            'startsAt' => $this->starts_at?->toDateString(),
            'expiresAt' => $this->expires_at?->toDateString(),
        ];
    }
}
