<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\DeliveryPincode;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\User;
use App\Models\WhatsAppNotification;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class OrderNumberFormatTest extends TestCase
{
    use RefreshDatabase;

    private int $categorySeq = 0;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function makeProduct(): Product
    {
        $this->categorySeq++;

        return Product::create([
            'name' => 'Product ' . $this->categorySeq,
            'category_id' => ProductCategory::create([
                'name' => 'Category ' . $this->categorySeq,
                'active' => true,
            ])->id,
            'price' => 100.00,
            'unit' => '500 GM',
            'available' => true,
            'stock_quantity' => 100,
        ]);
    }

    private function prepareCheckout(User $user): void
    {
        $cart = Cart::firstOrCreate([
            'user_id' => $user->id,
            'status' => Cart::STATUS_ACTIVE,
        ]);
        CartItem::create([
            'cart_id' => $cart->id,
            'product_id' => $this->makeProduct()->id,
            'quantity' => 1,
            'unit_price' => 100.00,
        ]);

        DeliveryPincode::firstOrCreate(
            ['pincode' => '500001'],
            ['delivery_charge' => 40.00, 'active' => true]
        );
    }

    /**
     * @return array<string,mixed>
     */
    private function address(): array
    {
        return [
            'name' => 'Asha Rao',
            'phone' => '9876543210',
            'address' => '12-3, Green Street',
            'city' => 'Hyderabad',
            'state' => 'Telangana',
            'pincode' => '500001',
        ];
    }

    private function createOrderViaApi(User $user): \Illuminate\Testing\TestResponse
    {
        $this->prepareCheckout($user);

        return $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->address())
            ->assertCreated();
    }

    public function test_new_order_receives_the_new_order_number_format(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-17 10:00:45', 'UTC'));

        $user = User::factory()->create(['phone' => '9876543210']);
        $response = $this->createOrderViaApi($user);
        $number = $response->json('data.orderNumber');

        $this->assertMatchesRegularExpression('/^SF261117153045[A-Z]{4}$/', $number);
        $this->assertDatabaseHas('orders', [
            'id' => $response->json('data.id'),
            'order_number' => $number,
        ]);
    }

    public function test_order_number_date_and_time_use_ist_not_the_app_utc_timezone(): void
    {
        $this->assertSame('UTC', config('app.timezone'));

        // 10:00:45 UTC is 15:30:45 IST on the same date.
        Carbon::setTestNow(Carbon::parse('2026-11-17 10:00:45', 'UTC'));
        $user = User::factory()->create(['phone' => '9876543210']);
        $this->assertStringStartsWith('SF261117153045', $this->createOrderViaApi($user)->json('data.orderNumber'));

        // 18:30:45 UTC is 00:00:45 IST on the following date.
        Carbon::setTestNow(Carbon::parse('2026-11-17 18:30:45', 'UTC'));
        $user = User::factory()->create(['phone' => '9876543211']);
        $this->assertStringStartsWith('SF261118000045', $this->createOrderViaApi($user)->json('data.orderNumber'));
    }

    public function test_order_number_ends_with_exactly_four_uppercase_letters(): void
    {
        $user = User::factory()->create(['phone' => '9876543210']);
        $number = $this->createOrderViaApi($user)->json('data.orderNumber');

        $this->assertMatchesRegularExpression('/^SF\d{12}[A-Z]{4}$/', $number);
        preg_match('/^SF\d{12}([A-Z]{4})$/', $number, $matches);
        $this->assertSame(4, strlen($matches[1]));
    }

    public function test_multiple_orders_receive_unique_order_numbers(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-17 10:00:45', 'UTC'));

        $user = User::factory()->create(['phone' => '9876543210']);
        $numbers = [];

        for ($i = 0; $i < 5; $i++) {
            $numbers[] = $this->createOrderViaApi($user)->json('data.orderNumber');
        }

        $this->assertCount(5, array_unique($numbers));
        foreach ($numbers as $number) {
            $this->assertMatchesRegularExpression('/^SF261117153045[A-Z]{4}$/', $number);
        }
    }

    public function test_existing_order_numbers_remain_unchanged(): void
    {
        $user = User::factory()->create(['phone' => '9876543210']);
        $legacyNumber = 'SF261117ABC123';

        $legacyOrder = Order::create([
            'order_number' => $legacyNumber,
            'user_id' => $user->id,
            'status' => Order::STATUS_CREATED,
            'payment_status' => Order::PAYMENT_PENDING,
            'subtotal' => 100,
            'discount_amount' => 0,
            'delivery_charge' => 0,
            'tax_amount' => 0,
            'total_amount' => 100,
            'currency' => 'INR',
            'customer_name' => $user->name,
            'customer_phone' => $user->phone,
            'customer_email' => $user->email,
            'delivery_address' => '12-3, Green Street, Hyderabad',
        ]);

        $newNumber = $this->createOrderViaApi($user)->json('data.orderNumber');

        $this->assertDatabaseHas('orders', ['id' => $legacyOrder->id, 'order_number' => $legacyNumber]);
        $this->assertNotSame($legacyNumber, $newNumber);
        $this->assertMatchesRegularExpression('/^SF\d{12}[A-Z]{4}$/', $newNumber);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/orders/{$legacyOrder->id}")
            ->assertOk()
            ->assertJsonPath('data.orderNumber', $legacyNumber);
    }

    public function test_order_number_is_identical_in_customer_and_admin_views(): void
    {
        $customer = User::factory()->create(['phone' => '9876543210']);
        $response = $this->createOrderViaApi($customer);
        $orderId = $response->json('data.id');
        $number = $response->json('data.orderNumber');

        $this->actingAs($customer, 'sanctum')->getJson('/api/orders')
            ->assertOk()->assertJsonPath('data.0.orderNumber', $number);
        $this->actingAs($customer, 'sanctum')->getJson("/api/orders/{$orderId}")
            ->assertOk()->assertJsonPath('data.orderNumber', $number);

        $admin = User::factory()->create(['role' => User::ROLE_ADMIN, 'phone' => '9000000001']);
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/orders')
            ->assertOk()->assertJsonPath('data.0.orderNumber', $number);
        $this->actingAs($admin, 'sanctum')->getJson("/api/admin/orders/{$orderId}")
            ->assertOk()->assertJsonPath('data.orderNumber', $number);
    }

    public function test_whatsapp_notifications_and_invoice_text_use_the_generated_order_number(): void
    {
        config([
            'services.whatsapp.service_url' => 'https://whatsapp.test',
            'services.whatsapp.api_key' => 'test-api-key',
            'services.whatsapp.phone_number_id' => '123456789',
            'services.whatsapp.language' => 'en',
            'services.whatsapp.templates.order_confirmed' => 'order_confirmed',
            'services.whatsapp.templates.order_status_update' => 'order_status_update',
            'services.whatsapp.template_languages.order_confirmed' => 'en',
            'services.whatsapp.template_languages.order_status_update' => 'en',
        ]);

        // The service only uses an existing secure invoice route; never invents one.
        Route::get('/test/invoices/{order}', fn (Order $order) => 'invoice-'.$order->id)
            ->name('orders.invoice');
        Route::getRoutes()->refreshNameLookups();

        Http::fake(['*' => Http::response(['messages' => [['id' => 'wamid.TEST']]], 200)]);

        $customer = User::factory()->create(['phone' => '9876543210']);
        $response = $this->createOrderViaApi($customer);
        $orderId = $response->json('data.id');
        $number = $response->json('data.orderNumber');

        Http::assertSent(fn ($request): bool => $request['type'] === 'text'
            && str_contains((string) $request['text']['body'], $number));

        Http::assertSent(fn ($request): bool => $request['type'] === 'template'
            && $request['template']['name'] === 'order_confirmed'
            && $request['template']['components'][0]['parameters'][1]['text'] === $number);

        $admin = User::factory()->create(['role' => User::ROLE_ADMIN, 'phone' => '9000000001']);
        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$orderId}/status", ['status' => 'CONFIRMED'])
            ->assertOk();

        Http::assertSent(fn ($request): bool => $request['type'] === 'template'
            && $request['template']['name'] === 'order_status_update'
            && $request['template']['components'][0]['parameters'][1]['text'] === $number);

        $this->assertDatabaseHas('whatsapp_notifications', [
            'order_id' => $orderId,
            'event_type' => WhatsAppNotification::EVENT_ORDER_CONFIRMED,
            'status' => WhatsAppNotification::STATUS_SUBMITTED,
        ]);
    }

    public function test_existing_checkout_and_payment_workflow_still_works_with_the_new_format(): void
    {
        $user = User::factory()->create(['phone' => '9876543210']);
        $this->prepareCheckout($user);

        $this->actingAs($user, 'sanctum')->postJson('/api/checkout/quote', ['pincode' => '500001'])
            ->assertOk()->assertJsonPath('serviceable', true);

        $this->actingAs($user, 'sanctum')->postJson('/api/checkout/pay', ['pincode' => '500001'])
            ->assertOk()->assertJsonPath('payment_status', 'PAID');

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/orders', $this->address())
            ->assertCreated()->assertJsonPath('data.paymentStatus', 'PAID');

        $number = $response->json('data.orderNumber');
        $this->assertMatchesRegularExpression('/^SF\d{12}[A-Z]{4}$/', $number);
        $this->assertDatabaseHas('payments', [
            'order_id' => $response->json('data.id'),
            'gateway_order_id' => $number,
            'status' => 'PAID',
        ]);
    }
}
