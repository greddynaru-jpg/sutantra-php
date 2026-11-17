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
use App\Services\WhatsAppOrderNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Tests\TestCase;

class WhatsAppOrderNotificationTest extends TestCase
{
    use RefreshDatabase;

    private int $categorySeq = 0;

    protected function setUp(): void
    {
        parent::setUp();

        // Real HTTP is never used: every test either fakes it or relies on the
        // blanked WhatsApp configuration from phpunit.xml (which skips sending).
        config([
            'services.whatsapp.service_url' => 'https://whatsapp.test',
            'services.whatsapp.api_key' => 'test-api-key',
            'services.whatsapp.phone_number_id' => '123456789',
            'services.whatsapp.language' => 'en',
            'services.whatsapp.timeout' => 5,
            'services.whatsapp.templates.order_confirmed' => 'order_confirmed',
            'services.whatsapp.templates.order_status_update' => 'order_status_update',
            'services.whatsapp.template_languages.order_confirmed' => 'en',
            'services.whatsapp.template_languages.order_status_update' => 'en',
            'services.whatsapp.ca_bundle' => null,
        ]);
    }

    private function makeProduct(array $overrides = []): Product
    {
        $this->categorySeq++;
        $category = ProductCategory::create([
            'name' => 'Category ' . $this->categorySeq,
            'active' => true,
        ]);

        return Product::create(array_merge([
            'name' => 'Product ' . uniqid(),
            'category_id' => $category->id,
            'price' => 100.00,
            'unit' => '500 GM',
            'available' => true,
            'stock_quantity' => 10,
        ], $overrides));
    }

    private function fillCart(User $user, array $productsAndQuantities): Cart
    {
        $cart = Cart::create(['user_id' => $user->id, 'status' => Cart::STATUS_ACTIVE]);

        foreach ($productsAndQuantities as [$product, $quantity]) {
            CartItem::create([
                'cart_id' => $cart->id,
                'product_id' => $product->id,
                'quantity' => $quantity,
                'unit_price' => $product->price,
            ]);
        }

        return $cart;
    }

    private function pincode(string $pincode = '500001', float $charge = 40.00): DeliveryPincode
    {
        return DeliveryPincode::create([
            'pincode' => $pincode,
            'delivery_charge' => $charge,
            'active' => true,
        ]);
    }

    private function address(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Asha Rao',
            'phone' => '9876543210',
            'address' => '12-3, Green Street',
            'city' => 'Hyderabad',
            'state' => 'Telangana',
            'pincode' => '500001',
        ], $overrides);
    }

    private function makeAdmin(): User
    {
        return User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'phone' => '9000000001',
        ]);
    }

    private function makeOrder(User $customer, array $overrides = []): Order
    {
        return Order::create(array_merge([
            'order_number' => 'ORD-'.Str::upper(Str::random(10)),
            'user_id' => $customer->id,
            'status' => Order::STATUS_CREATED,
            'payment_status' => Order::PAYMENT_PENDING,
            'subtotal' => 100,
            'discount_amount' => 0,
            'delivery_charge' => 0,
            'tax_amount' => 0,
            'total_amount' => 100,
            'currency' => 'INR',
            'customer_name' => $customer->name ?? 'Asha Rao',
            'customer_phone' => $customer->phone ?? '',
            'customer_email' => $customer->email,
            'delivery_address' => '12-3, Green Street, Hyderabad',
        ], $overrides));
    }

    private function fakeSuccess(string $messageId = 'wamid.TEST'): void
    {
        Http::fake([
            '*' => Http::response(['messages' => [['id' => $messageId]]], 200),
        ]);
    }

    public function test_successful_order_creation_sends_exactly_one_confirmation_notification(): void
    {
        $this->fakeSuccess('wamid.CONFIRM1');

        $user = User::factory()->create(['phone' => '9876543210']);
        $product = $this->makeProduct(['price' => 130.00]);
        $this->fillCart($user, [[$product, 2]]);
        $this->pincode('500001', 40.00);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->address())
            ->assertCreated();

        $order = Order::findOrFail($response->json('data.id'));

        $this->assertDatabaseHas('whatsapp_notifications', [
            'order_id' => $order->id,
            'event_type' => WhatsAppNotification::EVENT_ORDER_CONFIRMED,
            'event_key' => WhatsAppNotification::EVENT_ORDER_CONFIRMED,
            'template_name' => 'order_confirmed',
            'recipient' => '919876543210',
            'status' => WhatsAppNotification::STATUS_SUBMITTED,
            'provider_message_id' => 'wamid.CONFIRM1',
        ]);

        // No invoice route exists in this application, so only the approved
        // three-parameter template is sent (no invalid/hardcoded invoice link).
        Http::assertSentCount(1);

        Http::assertSent(function ($request) use ($order): bool {
            $parameters = $request['template']['components'][0]['parameters'] ?? [];

            return $request->url() === 'https://whatsapp.test/v3/123456789/messages'
                && $request['to'] === '919876543210'
                && $request['messaging_product'] === 'whatsapp'
                && $request['type'] === 'template'
                && $request['template']['name'] === 'order_confirmed'
                && $request['template']['language']['code'] === 'en'
                && count($request['template']['components']) === 1
                && $request['template']['components'][0]['type'] === 'body'
                && count($parameters) === 3
                && $parameters[0]['text'] === 'Asha Rao'
                && $parameters[1]['text'] === $order->order_number
                && $parameters[2]['text'] === '300.00'
                && $request->hasHeader('apikey', 'test-api-key');
        });
    }

    public function test_repeated_order_submission_does_not_send_another_confirmation(): void
    {
        $this->fakeSuccess('wamid.ONCE');

        $user = User::factory()->create(['phone' => '9876543210']);
        $product = $this->makeProduct();
        $this->fillCart($user, [[$product, 1]]);
        $this->pincode();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->address())
            ->assertCreated();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->address())
            ->assertStatus(422)
            ->assertJsonPath('message', 'Your cart is empty.');

        $this->assertDatabaseCount('whatsapp_notifications', 1);
        Http::assertSentCount(1);
    }

    public function test_payment_placeholder_creation_does_not_send_a_confirmation(): void
    {
        Http::fake();

        $user = User::factory()->create(['phone' => '9876543210']);
        $product = $this->makeProduct();
        $this->fillCart($user, [[$product, 1]]);
        $this->pincode();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/checkout/pay', ['pincode' => '500001'])
            ->assertOk()
            ->assertJsonPath('payment_status', 'PAID');

        $this->assertDatabaseCount('whatsapp_notifications', 0);
        Http::assertNothingSent();
    }

    public function test_placeholder_finalization_sends_the_confirmation_once(): void
    {
        $this->fakeSuccess('wamid.FINAL');

        $user = User::factory()->create(['phone' => '9876543210']);
        $product = $this->makeProduct();
        $this->fillCart($user, [[$product, 1]]);
        $this->pincode();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/checkout/pay', ['pincode' => '500001'])
            ->assertOk();

        $this->assertDatabaseCount('whatsapp_notifications', 0);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->address())
            ->assertCreated();

        $this->assertDatabaseHas('whatsapp_notifications', [
            'order_id' => $response->json('data.id'),
            'event_type' => WhatsAppNotification::EVENT_ORDER_CONFIRMED,
            'status' => WhatsAppNotification::STATUS_SUBMITTED,
        ]);
        $this->assertDatabaseCount('whatsapp_notifications', 1);
        Http::assertSentCount(1);
    }

    public function test_invoice_link_is_sent_after_confirmation_and_points_to_the_same_order(): void
    {
        // Simulates an existing secure invoice route. The service never invents
        // one; it only uses a route the application actually exposes.
        Route::get('/test/invoices/{order}', fn (Order $order) => 'invoice-'.$order->id)
            ->name('orders.invoice');
        Route::getRoutes()->refreshNameLookups();

        $this->fakeSuccess('wamid.INVOICE');

        $user = User::factory()->create(['phone' => '9876543210']);
        $product = $this->makeProduct();
        $this->fillCart($user, [[$product, 1]]);
        $this->pincode();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->address())
            ->assertCreated();

        $orderId = $response->json('data.id');

        Http::assertSentCount(2);

        Http::assertSent(function ($request) use ($orderId): bool {
            $body = (string) ($request['text']['body'] ?? '');

            return $request['type'] === 'text'
                && $request['to'] === '919876543210'
                && str_contains($body, "/test/invoices/{$orderId}");
        });

        $this->assertDatabaseHas('whatsapp_notifications', [
            'order_id' => $orderId,
            'event_type' => WhatsAppNotification::EVENT_ORDER_INVOICE_LINK,
            'event_key' => 'ORDER_CONFIRMED:INVOICE',
            'status' => WhatsAppNotification::STATUS_SUBMITTED,
        ]);
    }

    public function test_successful_status_change_sends_one_notification_with_master_label(): void
    {
        $this->fakeSuccess('wamid.STATUS1');

        $admin = $this->makeAdmin();
        $customer = User::factory()->create(['phone' => '9876543210']);
        $order = $this->makeOrder($customer);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'CONFIRMED'])
            ->assertOk()
            ->assertJsonPath('data.status', 'ORDER_CONFIRMED');

        $this->assertDatabaseHas('whatsapp_notifications', [
            'order_id' => $order->id,
            'event_type' => WhatsAppNotification::EVENT_ORDER_STATUS_UPDATED,
            'event_key' => 'ORDER_STATUS_UPDATED:CREATED>ORDER_CONFIRMED',
            'template_name' => 'order_status_update',
            'recipient' => '919876543210',
            'status' => WhatsAppNotification::STATUS_SUBMITTED,
            'provider_message_id' => 'wamid.STATUS1',
        ]);

        Http::assertSentCount(1);

        Http::assertSent(function ($request) use ($customer): bool {
            $parameters = $request['template']['components'][0]['parameters'] ?? [];

            return $request['template']['name'] === 'order_status_update'
                && count($parameters) === 3
                && $parameters[0]['text'] === $customer->name
                && $parameters[2]['text'] === 'Order Confirmed';
        });
    }

    public function test_each_order_template_uses_its_configured_language(): void
    {
        config([
            'services.whatsapp.template_languages.order_confirmed' => 'en_GB',
            'services.whatsapp.template_languages.order_status_update' => 'en_US',
        ]);

        $this->fakeSuccess();

        $customer = User::factory()->create(['phone' => '9876543210']);
        $order = $this->makeOrder($customer);
        $service = app(WhatsAppOrderNotificationService::class);

        $service->sendOrderConfirmation($order);
        $service->sendOrderStatusUpdate($order, Order::STATUS_CREATED, 'ORDER_CONFIRMED');

        Http::assertSent(fn ($request): bool => $request['template']['name'] === 'order_confirmed'
            && $request['template']['language']['code'] === 'en_GB');

        Http::assertSent(fn ($request): bool => $request['template']['name'] === 'order_status_update'
            && $request['template']['language']['code'] === 'en_US');
    }

    public function test_unchanged_status_does_not_send_a_notification(): void
    {
        Http::fake();

        $admin = $this->makeAdmin();
        $customer = User::factory()->create(['phone' => '9876543210']);
        $order = $this->makeOrder($customer, ['status' => Order::STATUS_CREATED]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/status", ['status' => Order::STATUS_CREATED])
            ->assertOk();

        $this->assertDatabaseCount('whatsapp_notifications', 0);
        Http::assertNothingSent();
    }

    public function test_invalid_status_transition_does_not_send_a_notification(): void
    {
        Http::fake();

        $admin = $this->makeAdmin();
        $customer = User::factory()->create(['phone' => '9876543210']);
        $order = $this->makeOrder($customer, ['status' => Order::STATUS_CREATED]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'DELIVERED'])
            ->assertStatus(422);

        $this->assertDatabaseCount('whatsapp_notifications', 0);
        Http::assertNothingSent();
    }

    public function test_each_legitimate_status_transition_sends_its_own_notification(): void
    {
        $this->fakeSuccess('wamid.MULTI');

        $admin = $this->makeAdmin();
        $customer = User::factory()->create(['phone' => '9876543210']);
        $order = $this->makeOrder($customer, ['status' => Order::STATUS_CREATED]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'CONFIRMED'])
            ->assertOk();

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'PROCESSING'])
            ->assertOk();

        $this->assertDatabaseCount('whatsapp_notifications', 2);
        $this->assertDatabaseHas('whatsapp_notifications', [
            'order_id' => $order->id,
            'event_key' => 'ORDER_STATUS_UPDATED:CREATED>ORDER_CONFIRMED',
        ]);
        $this->assertDatabaseHas('whatsapp_notifications', [
            'order_id' => $order->id,
            'event_key' => 'ORDER_STATUS_UPDATED:ORDER_CONFIRMED>PROCESSING',
        ]);
        Http::assertSentCount(2);
    }

    public function test_missing_customer_mobile_does_not_break_order_processing(): void
    {
        Http::fake();

        $admin = $this->makeAdmin();
        $customer = User::factory()->create(['phone' => null]);
        $order = $this->makeOrder($customer, ['customer_phone' => '']);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'CONFIRMED'])
            ->assertOk()
            ->assertJsonPath('data.status', 'ORDER_CONFIRMED');

        $this->assertDatabaseHas('whatsapp_notifications', [
            'order_id' => $order->id,
            'event_type' => WhatsAppNotification::EVENT_ORDER_STATUS_UPDATED,
            'recipient' => null,
            'status' => WhatsAppNotification::STATUS_SKIPPED,
        ]);
        Http::assertNothingSent();
    }

    public function test_provider_failure_does_not_break_order_creation_or_status_updates(): void
    {
        Http::fake([
            '*' => Http::response(['error' => 'provider unavailable'], 500),
        ]);

        $user = User::factory()->create(['phone' => '9876543210']);
        $product = $this->makeProduct();
        $this->fillCart($user, [[$product, 1]]);
        $this->pincode();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->address())
            ->assertCreated();

        $orderId = $response->json('data.id');

        $this->assertDatabaseHas('orders', ['id' => $orderId]);
        $this->assertDatabaseHas('whatsapp_notifications', [
            'order_id' => $orderId,
            'event_type' => WhatsAppNotification::EVENT_ORDER_CONFIRMED,
            'status' => WhatsAppNotification::STATUS_FAILED,
        ]);
        $this->assertNotNull(
            WhatsAppNotification::where('order_id', $orderId)->value('failure_reason')
        );

        $admin = $this->makeAdmin();
        $order = Order::findOrFail($orderId);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'CONFIRMED'])
            ->assertOk()
            ->assertJsonPath('data.status', 'ORDER_CONFIRMED');

        $this->assertDatabaseHas('orders', ['id' => $orderId, 'status' => 'ORDER_CONFIRMED']);
        $this->assertDatabaseHas('whatsapp_notifications', [
            'order_id' => $orderId,
            'event_type' => WhatsAppNotification::EVENT_ORDER_STATUS_UPDATED,
            'status' => WhatsAppNotification::STATUS_FAILED,
        ]);
    }

    public function test_failed_notification_can_be_retried_without_creating_a_duplicate(): void
    {
        $failNextSend = true;

        Http::fake(function () use (&$failNextSend) {
            if ($failNextSend) {
                $failNextSend = false;

                return Http::response(['error' => 'provider unavailable'], 500);
            }

            return Http::response(['messages' => [['id' => 'wamid.RETRY']]], 200);
        });

        $user = User::factory()->create(['phone' => '9876543210']);
        $product = $this->makeProduct();
        $this->fillCart($user, [[$product, 1]]);
        $this->pincode();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->address())
            ->assertCreated();

        $order = Order::findOrFail($response->json('data.id'));
        $record = WhatsAppNotification::where('order_id', $order->id)
            ->where('event_key', WhatsAppNotification::EVENT_ORDER_CONFIRMED)
            ->firstOrFail();

        $this->assertSame(WhatsAppNotification::STATUS_FAILED, $record->status);

        app(WhatsAppOrderNotificationService::class)->sendOrderConfirmation($order);

        $record->refresh();

        $this->assertDatabaseCount('whatsapp_notifications', 1);
        $this->assertSame(WhatsAppNotification::STATUS_SUBMITTED, $record->status);
        $this->assertSame('wamid.RETRY', $record->provider_message_id);
        $this->assertSame(2, $record->attempts);
    }

    public function test_existing_otp_request_and_verification_flow_still_works(): void
    {
        Http::fake();

        $user = User::factory()->create(['phone' => '9876543210']);

        $this->postJson('/api/auth/request-code', ['identifier' => '9876543210'])
            ->assertOk()
            ->assertJsonPath('message', 'Verification code requested.');

        $this->assertDatabaseHas('user_otp_verifications', [
            'user_id' => $user->id,
            'is_verified' => false,
        ]);

        // A wrong OTP is still rejected by the existing verification endpoint.
        $this->postJson('/api/auth/verify-otp', [
            'identifier' => '9876543210',
            'verification_code' => '000000',
        ])->assertStatus(422);

        $this->assertDatabaseCount('whatsapp_notifications', 0);
    }
}
