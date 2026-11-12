<?php

namespace App\Http\Resources;

use App\Models\OrderStatus;
use App\Models\PaymentStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A created order. Mirrors the cart resource style (camelCase) so the React
 * checkout confirmation can render it directly.
 */
class OrderResource extends JsonResource
{
    /** @var array<string,string>|null */
    private static ?array $orderStatusLabels = null;
    /** @var array<string,string>|null */
    private static ?array $paymentStatusLabels = null;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $statusCode = strtoupper((string) $this->status);
        $paymentCode = strtoupper((string) $this->payment_status);

        return [
            'id' => $this->id,
            'orderNumber' => $this->order_number,
            'status' => $this->status,
            'statusDisplayName' => $this->resolveOrderStatusLabel($statusCode),
            'paymentStatus' => $this->payment_status,
            'paymentStatusDisplayName' => $this->resolvePaymentStatusLabel($paymentCode),
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
            'itemsCount' => $this->whenCounted('items'),
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }

    private function resolveOrderStatusLabel(string $code): string
    {
        if (self::$orderStatusLabels === null) {
            self::$orderStatusLabels = [];
            foreach (OrderStatus::query()->orderBy('sort_order')->orderBy('id')->get() as $s) {
                $c = strtoupper((string) $s->code);
                if ($c !== '') {
                    self::$orderStatusLabels[$c] = (string) ($s->label ?? $s->code);
                }
            }
        }

        $map = self::$orderStatusLabels;
        if (isset($map[$code])) {
            return $map[$code];
        }
        // Resolve legacy stored code using DB-configured master display name (no record changes).
        if ($code === 'CREATED' && isset($map['ORDER_PLACED'])) {
            return $map['ORDER_PLACED'];
        }
        if ($code === 'CONFIRMED' && isset($map['ORDER_CONFIRMED'])) {
            return $map['ORDER_CONFIRMED'];
        }

        return $code !== '' ? $code : 'Unknown';
    }

    private function resolvePaymentStatusLabel(string $code): string
    {
        if (self::$paymentStatusLabels === null) {
            self::$paymentStatusLabels = [];
            foreach (PaymentStatus::query()->orderBy('sort_order')->orderBy('id')->get() as $s) {
                $c = strtoupper((string) ($s->status_code ?? $s->code ?? ''));
                $label = (string) ($s->display_name ?? $s->label ?? $c);
                if ($c !== '') {
                    self::$paymentStatusLabels[$c] = $label;
                }
            }
        }

        $map = self::$paymentStatusLabels;
        return $map[$code] ?? ($code !== '' ? $code : 'Unknown');
    }
}
