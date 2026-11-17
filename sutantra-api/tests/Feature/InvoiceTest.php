<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class InvoiceTest extends TestCase
{
    use RefreshDatabase;

    private function makeOrder(User $customer): array
    {
        $category = ProductCategory::create(['name' => 'Invoice Category', 'active' => true]);
        $product = Product::create([
            'name' => 'Original Product',
            'category_id' => $category->id,
            'price' => 125.50,
            'unit' => '500 GM',
            'available' => true,
            'stock_quantity' => 10,
        ]);

        $order = Order::create([
            'order_number' => 'SF261117153045ABCD',
            'user_id' => $customer->id,
            'status' => Order::STATUS_CREATED,
            'payment_status' => Order::PAYMENT_PAID,
            'subtotal' => 251.00,
            'discount_amount' => 10.00,
            'delivery_charge' => 40.00,
            'tax_amount' => 5.00,
            'total_amount' => 286.00,
            'currency' => 'INR',
            'customer_name' => 'Asha Rao',
            'customer_phone' => '9876543210',
            'customer_email' => 'asha@example.com',
            'delivery_address' => "12-3, Green Street\nHyderabad, Telangana - 500001",
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => 'Stored Product Name',
            'quantity' => 2,
            'unit_price' => 125.50,
            'total_price' => 251.00,
            'unit' => '500 GM',
        ]);

        return [$order, $product];
    }

    public function test_owner_can_preview_invoice_with_stored_order_data(): void
    {
        $customer = User::factory()->create(['phone' => '9876543210']);
        [$order] = $this->makeOrder($customer);

        $response = $this->actingAs($customer, 'sanctum')
            ->getJson("/api/orders/{$order->id}/invoice")
            ->assertOk();

        $response->assertJsonPath('data.invoiceNumber', 'INV-SF261117153045ABCD')
            ->assertJsonPath('data.orderNumber', 'SF261117153045ABCD')
            ->assertJsonPath('data.paymentStatus', 'PAID')
            ->assertJsonPath('data.paymentStatusLabel', 'Paid')
            ->assertJsonPath('data.customerName', 'Asha Rao')
            ->assertJsonPath('data.customerEmail', 'asha@example.com')
            ->assertJsonPath('data.customerPhone', '9876543210')
            ->assertJsonPath('data.deliveryAddress.0', '12-3, Green Street')
            ->assertJsonPath('data.deliveryAddress.1', 'Hyderabad, Telangana - 500001')
            ->assertJsonPath('data.items.0.name', 'Stored Product Name')
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.items.0.unit', '500 GM')
            ->assertJsonPath('data.items.0.unitPrice', 'INR 125.50')
            ->assertJsonPath('data.items.0.amount', 'INR 251.00')
            ->assertJsonPath('data.subtotal', 'INR 251.00')
            ->assertJsonPath('data.deliveryCharge', 'INR 40.00')
            ->assertJsonPath('data.discount', '-INR 10.00')
            ->assertJsonPath('data.tax', 'INR 5.00')
            ->assertJsonPath('data.total', 'INR 286.00');

        $this->assertNotEmpty($response->json('data.date'));
        // WhatsApp invoice-link detection must remain untouched.
        $this->assertFalse(Route::has('orders.invoice'));
    }

    public function test_customer_cannot_access_another_customers_invoice(): void
    {
        $owner = User::factory()->create(['phone' => '9876543210']);
        [$order] = $this->makeOrder($owner);
        $other = User::factory()->create(['phone' => '9876543211']);

        $this->actingAs($other, 'sanctum')
            ->getJson("/api/orders/{$order->id}/invoice")
            ->assertNotFound();

        $this->actingAs($other, 'sanctum')
            ->get("/api/orders/{$order->id}/invoice/download")
            ->assertNotFound();
    }

    public function test_unauthenticated_invoice_request_is_rejected(): void
    {
        $customer = User::factory()->create(['phone' => '9876543210']);
        [$order] = $this->makeOrder($customer);

        $this->getJson("/api/orders/{$order->id}/invoice")->assertUnauthorized();
    }

    public function test_pdf_download_uses_exact_filename_and_a4_page(): void
    {
        $customer = User::factory()->create(['phone' => '9876543210']);
        [$order] = $this->makeOrder($customer);

        $response = $this->actingAs($customer, 'sanctum')
            ->get("/api/orders/{$order->id}/invoice/download")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf')
            ->assertHeader('Content-Disposition', 'attachment; filename="SUTANTRA-Invoice-SF261117153045ABCD.pdf"');

        $pdf = $response->getContent();

        $this->assertStringStartsWith('%PDF-1.4', $pdf);
        $this->assertStringContainsString('/MediaBox [0 0 595.28 841.89]', $pdf);
        $this->assertStringContainsString('%%EOF', $pdf);
        $this->assertStringContainsString('/Type /Page', $pdf);
    }

    public function test_preview_and_pdf_contain_the_same_information(): void
    {
        $customer = User::factory()->create(['phone' => '9876543210']);
        [$order] = $this->makeOrder($customer);

        $invoice = $this->actingAs($customer, 'sanctum')
            ->getJson("/api/orders/{$order->id}/invoice")
            ->assertOk()
            ->json('data');

        $pdf = $this->actingAs($customer, 'sanctum')
            ->get("/api/orders/{$order->id}/invoice/download")
            ->assertOk()
            ->getContent();

        $values = [
            $invoice['invoiceNumber'],
            $invoice['orderNumber'],
            $invoice['date'],
            $invoice['paymentStatusLabel'],
            $invoice['customerName'],
            $invoice['customerEmail'],
            'Phone: '.$invoice['customerPhone'],
            ...$invoice['deliveryAddress'],
            $invoice['items'][0]['name'],
            'Unit: '.$invoice['items'][0]['unit'],
            (string) $invoice['items'][0]['quantity'],
            $invoice['items'][0]['unitPrice'],
            $invoice['items'][0]['amount'],
            $invoice['subtotal'],
            $invoice['deliveryCharge'],
            $invoice['discount'],
            $invoice['tax'],
            $invoice['total'],
        ];

        foreach ($values as $value) {
            $this->assertStringContainsString($value, $pdf, "PDF is missing: {$value}");
        }
    }

    public function test_invoice_uses_historical_item_prices_not_current_product_price(): void
    {
        $customer = User::factory()->create(['phone' => '9876543210']);
        [$order, $product] = $this->makeOrder($customer);

        $product->update(['price' => 999.00]);

        $this->actingAs($customer, 'sanctum')
            ->getJson("/api/orders/{$order->id}/invoice")
            ->assertOk()
            ->assertJsonPath('data.items.0.unitPrice', 'INR 125.50')
            ->assertJsonPath('data.items.0.amount', 'INR 251.00')
            ->assertJsonPath('data.total', 'INR 286.00');
    }

    public function test_existing_order_detail_endpoint_remains_unchanged(): void
    {
        $customer = User::factory()->create(['phone' => '9876543210']);
        [$order] = $this->makeOrder($customer);

        $this->actingAs($customer, 'sanctum')
            ->getJson("/api/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.orderNumber', 'SF261117153045ABCD')
            ->assertJsonPath('data.totalAmount', 286)
            ->assertJsonPath('data.items.0.productName', 'Stored Product Name');
    }
}
