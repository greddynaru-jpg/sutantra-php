<?php

namespace App\Services;

use App\Models\Order;
use App\Models\PaymentStatus;

/**
 * Builds the single canonical invoice payload used by both the HTML preview
 * and the PDF. All amounts come from the order's stored historical values.
 */
final class InvoiceService
{
    /**
     * @return array<string,mixed>
     */
    public function forOrder(Order $order): array
    {
        $order->loadMissing('items');

        $paymentCode = strtoupper(trim((string) $order->payment_status));
        $paymentLabel = PaymentStatus::query()
            ->where('status_code', $paymentCode)
            ->value('display_name');

        $items = $order->items->map(fn ($item): array => [
            'name' => (string) ($item->product_name ?: 'Item'),
            'unit' => (string) ($item->unit ?? ''),
            'quantity' => (int) $item->quantity,
            'unitPrice' => $this->money($item->unit_price),
            'amount' => $this->money($item->total_price),
        ])->all();

        return [
            'invoiceNumber' => 'INV-'.$order->order_number,
            'orderNumber' => (string) $order->order_number,
            'date' => $order->created_at?->format('d M Y, h:i A') ?? '',
            'paymentStatus' => $paymentCode,
            'paymentStatusLabel' => is_string($paymentLabel) && trim($paymentLabel) !== ''
                ? trim($paymentLabel)
                : ($paymentCode !== '' ? $paymentCode : 'Pending'),
            'customerName' => (string) ($order->customer_name ?: 'Customer'),
            'customerEmail' => (string) ($order->customer_email ?? ''),
            'customerPhone' => (string) ($order->customer_phone ?? ''),
            'deliveryAddress' => $this->addressLines((string) ($order->delivery_address ?? '')),
            'items' => $items,
            'subtotal' => $this->money($order->subtotal),
            'deliveryCharge' => $this->money($order->delivery_charge),
            'discount' => '-'.$this->money($order->discount_amount),
            'tax' => $this->money($order->tax_amount),
            'total' => $this->money($order->total_amount),
        ];
    }

    /**
     * @return list<string>
     */
    private function addressLines(string $address): array
    {
        $address = str_replace(["\r\n", "\r"], "\n", $address);
        $lines = array_map('trim', explode("\n", $address));

        return array_values(array_filter($lines, fn (string $line): bool => $line !== ''));
    }

    private function money(mixed $value): string
    {
        return 'INR '.number_format((float) $value, 2, '.', '');
    }
}
