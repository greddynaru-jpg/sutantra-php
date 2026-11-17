<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\InvoicePdfGenerator;
use App\Services\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Customer invoice actions for an order they already own.
 *
 * The route names deliberately avoid `orders.invoice` so the existing WhatsApp
 * invoice-link behaviour is not activated by adding these endpoints.
 */
class InvoiceController extends Controller
{
    public function __construct(
        private readonly InvoiceService $invoices,
        private readonly InvoicePdfGenerator $pdf
    ) {
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        $this->assertOwner($request, $order);

        return response()->json(['data' => $this->invoices->forOrder($order)]);
    }

    public function download(Request $request, Order $order): Response
    {
        $this->assertOwner($request, $order);

        $invoice = $this->invoices->forOrder($order);
        $safeNumber = preg_replace('/[^A-Za-z0-9._-]/', '_', $invoice['orderNumber']) ?: 'ORDER';

        return response($this->pdf->generate($invoice), 200)->withHeaders([
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="SUTANTRA-Invoice-'.$safeNumber.'.pdf"',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * A 404 (rather than 403) avoids revealing whether another customer's
     * order number exists.
     */
    private function assertOwner(Request $request, Order $order): void
    {
        if ((int) $order->user_id !== (int) $request->user()->id) {
            abort(404);
        }
    }
}
