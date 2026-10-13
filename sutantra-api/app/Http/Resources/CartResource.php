<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The authenticated user's cart. Mirrors the legacy CartDTO (items + totals)
 * so the React cart page and header count can render it directly.
 */
class CartResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $items = $this->relationLoaded('items') ? $this->items : collect();

        $total = $items->sum(function ($item) {
            $product = $item->relationLoaded('product') ? $item->product : null;
            $price = (float) ($product?->price ?? $item->unit_price);

            return $price * (int) $item->quantity;
        });

        return [
            'id' => $this->id,
            'userId' => $this->user_id,
            'status' => $this->status,
            'items' => CartItemResource::collection($items),
            'totalAmount' => round($total, 2),
            'totalQuantity' => (int) $items->sum(fn ($item) => (int) $item->quantity),
        ];
    }
}
