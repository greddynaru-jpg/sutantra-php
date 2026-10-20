<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A created order. Mirrors the cart resource style (camelCase) so the React
 * checkout confirmation can render it directly.
 */
class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'orderNumber' => $this->order_number,
            'status' => $this->status,
            'paymentStatus' => $this->payment_status,
            'subtotal' => (float) $this->subtotal,
            'discountAmount' => (float) $this->discount_amount,
            'deliveryCharge' => (float) $this->delivery_charge,
            'taxAmount' => (float) $this->tax_amount,
            'totalAmount' => (float) $this->total_amount,
            'currency' => $this->currency,
            'customerName' => $this->customer_name,
            'customerPhone' => $this->customer_phone,
            'customerEmail' => $this->customer_email,
            'deliveryAddress' => $this->delivery_address,
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'productId' => $item->product_id,
                'productName' => $item->product_name,
                'quantity' => (int) $item->quantity,
                'unit' => $item->unit,
                'unitPrice' => (float) $item->unit_price,
                'totalPrice' => (float) $item->total_price,
            ])),
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}
