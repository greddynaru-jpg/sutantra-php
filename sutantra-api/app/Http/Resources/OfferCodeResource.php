<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OfferCodeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'description' => $this->description,
            'discountType' => $this->discount_type,
            'discountValue' => (float) $this->discount_value,
            'minOrderAmount' => (float) $this->min_order_amount,
            'maxDiscount' => $this->max_discount === null ? null : (float) $this->max_discount,
            'startsAt' => $this->starts_at?->toDateString(),
            'expiresAt' => $this->expires_at?->toDateString(),
            'usageLimit' => $this->usage_limit,
            'perCustomerLimit' => $this->per_customer_limit,
            'usedCount' => (int) $this->used_count,
            'isActive' => (bool) $this->is_active,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
