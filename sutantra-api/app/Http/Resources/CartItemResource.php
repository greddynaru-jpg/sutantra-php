<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A single cart line. Mirrors the legacy CartItemDTO shape the React app
 * consumes (camelCase fields + an optional nested product).
 */
class CartItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $product = $this->relationLoaded('product') ? $this->product : null;
        $price = (float) ($product?->price ?? $this->unit_price);
        $quantity = (int) $this->quantity;

        return [
            'id' => $this->id,
            'productId' => $this->product_id,
            'productName' => $product?->name,
            'price' => $price,
            'quantity' => $quantity,
            'unit' => $product?->unit,
            'imageUrl' => $product?->image_url,
            'available' => (bool) ($product?->available ?? false),
            'stockQuantity' => $product ? (int) $product->stock_quantity : null,
            'subtotal' => round($price * $quantity, 2),
            'product' => $product ? new ProductResource($product) : null,
        ];
    }
}
