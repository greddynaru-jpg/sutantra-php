<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\DeliveryPincode;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    private const UNSERVICEABLE = 'Delivery is not available for this location.';

    private int $categorySeq = 0;

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

    private function pincode(string $pincode = '500001', float $charge = 40.00, bool $active = true): DeliveryPincode
    {
        return DeliveryPincode::create([
            'pincode' => $pincode,
            'delivery_charge' => $charge,
            'active' => $active,
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

    public function test_quote_and_order_require_authentication(): void
    {
        $this->postJson('/api/checkout/quote', ['pincode' => '500001'])->assertUnauthorized();
        $this->postJson('/api/orders', $this->address())->assertUnauthorized();
    }

    public function test_quote_rejects_unserviceable_pincode_with_exact_message(): void
    {
        $user = User::factory()->create();
        $product = $this->makeProduct();
        $this->fillCart($user, [[$product, 1]]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/checkout/quote', ['pincode' => '999999'])
            ->assertOk()
            ->assertJsonPath('serviceable', false)
            ->assertJsonPath('message', self::UNSERVICEABLE);

        $this->assertArrayNotHasKey('deliveryCharge', $response->json());
        $this->assertArrayNotHasKey('totalAmount', $response->json());
    }

    public function test_quote_rejects_inactive_pincode(): void
    {
        $user = User::factory()->create();
        $product = $this->makeProduct();
        $this->fillCart($user, [[$product, 1]]);
        $this->pincode('500001', 40.00, false);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/checkout/quote', ['pincode' => '500001'])
            ->assertOk()
            ->assertJsonPath('serviceable', false)
            ->assertJsonPath('message', self::UNSERVICEABLE);
    }

    public function test_quote_uses_database_prices_and_per_pincode_charge(): void
    {
        $user = User::factory()->create();
        $product = $this->makeProduct(['price' => 130.00]);
        $this->fillCart($user, [[$product, 2]]);
        $this->pincode('500001', 40.00);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/checkout/quote', [
                'pincode' => '500001',
                // Client-supplied amounts must be ignored.
                'subtotal' => 1,
                'deliveryCharge' => 0,
                'totalAmount' => 1,
                'serviceable' => true,
            ])
            ->assertOk()
            ->assertJsonPath('serviceable', true)
            ->assertJsonPath('subtotal', 260)
            ->assertJsonPath('deliveryCharge', 40)
            ->assertJsonPath('totalAmount', 300)
            ->assertJsonPath('discountAmount', 0)
            ->assertJsonPath('taxAmount', 0)
            ->assertJsonPath('items.0.productId', $product->id)
            ->assertJsonPath('items.0.quantity', 2)
            ->assertJsonPath('items.0.unitPrice', 130)
            ->assertJsonPath('items.0.lineTotal', 260);
    }

    public function test_quote_rejects_invalid_pincode_format(): void
    {
        $user = User::factory()->create();
        $product = $this->makeProduct();
        $this->fillCart($user, [[$product, 1]]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/checkout/quote', ['pincode' => '12AB'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('pincode');
    }

    public function test_quote_requires_a_non_empty_cart(): void
    {
        $user = User::factory()->create();
        $this->pincode();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/checkout/quote', ['pincode' => '500001'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Your cart is empty.');
    }

    public function test_unavailable_product_blocks_quote_and_order(): void
    {
        $user = User::factory()->create();
        $product = $this->makeProduct(['available' => false]);
        $this->fillCart($user, [[$product, 1]]);
        $this->pincode();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/checkout/quote', ['pincode' => '500001'])
            ->assertStatus(422);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->address())
            ->assertStatus(422);

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_insufficient_stock_blocks_order_and_leaves_no_partial_records(): void
    {
        $user = User::factory()->create();
        $product = $this->makeProduct(['stock_quantity' => 1]);
        $this->fillCart($user, [[$product, 2]]);
        $this->pincode();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->address())
            ->assertStatus(422);

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('order_items', 0);
    }

    public function test_order_is_created_with_server_totals_and_pending_payment(): void
    {
        $user = User::factory()->create(['email' => 'asha@example.test']);
        $product = $this->makeProduct(['price' => 130.00, 'unit' => '1 KG']);
        $cart = $this->fillCart($user, [[$product, 2]]);
        $this->pincode('500001', 40.00);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->address())
            ->assertCreated()
            ->assertJsonPath('data.status', Order::STATUS_CREATED)
            ->assertJsonPath('data.paymentStatus', Order::PAYMENT_PENDING)
            ->assertJsonPath('data.subtotal', 260)
            ->assertJsonPath('data.deliveryCharge', 40)
            ->assertJsonPath('data.totalAmount', 300)
            ->assertJsonPath('data.items.0.productId', $product->id)
            ->assertJsonPath('data.items.0.quantity', 2);

        $orderId = $response->json('data.id');

        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'user_id' => $user->id,
            'status' => Order::STATUS_CREATED,
            'payment_status' => Order::PAYMENT_PENDING,
            'subtotal' => 260,
            'delivery_charge' => 40,
            'total_amount' => 300,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'currency' => 'INR',
            'customer_name' => 'Asha Rao',
            'customer_phone' => '9876543210',
            'customer_email' => 'asha@example.test',
        ]);

        $order = Order::findOrFail($orderId);
        $this->assertStringContainsString('12-3, Green Street', $order->delivery_address);
        $this->assertStringContainsString('Hyderabad, Telangana - 500001', $order->delivery_address);
        $this->assertStringContainsString('Phone: 9876543210', $order->delivery_address);

        $this->assertDatabaseHas('order_items', [
            'order_id' => $orderId,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 2,
            'unit_price' => 130,
            'total_price' => 260,
            'unit' => '1 KG',
        ]);

        // Cart is cleared only after the order was created.
        $this->assertDatabaseCount('cart_items', 0);
        $this->assertDatabaseHas('carts', ['id' => $cart->id, 'status' => Cart::STATUS_ACTIVE]);

        // No payment record was fabricated.
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_client_supplied_totals_and_serviceability_are_ignored(): void
    {
        $user = User::factory()->create();
        $product = $this->makeProduct(['price' => 90.00]);
        $this->fillCart($user, [[$product, 2]]);
        $this->pincode('500001', 25.00);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->address([
                'subtotal' => 1,
                'deliveryCharge' => 0,
                'totalAmount' => 1,
                'serviceable' => true,
            ]))
            ->assertCreated()
            ->assertJsonPath('data.subtotal', 180)
            ->assertJsonPath('data.deliveryCharge', 25)
            ->assertJsonPath('data.totalAmount', 205);

        $this->assertDatabaseHas('orders', [
            'user_id' => $user->id,
            'subtotal' => 180,
            'delivery_charge' => 25,
            'total_amount' => 205,
        ]);
    }

    public function test_unserviceable_pincode_cannot_create_an_order(): void
    {
        $user = User::factory()->create();
        $product = $this->makeProduct();
        $this->fillCart($user, [[$product, 1]]);
        $this->pincode('500001', 40.00, false);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->address())
            ->assertStatus(422)
            ->assertJsonPath('message', self::UNSERVICEABLE)
            ->assertJsonValidationErrors('pincode');

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('cart_items', 1);
    }

    public function test_order_requires_all_delivery_details(): void
    {
        $user = User::factory()->create();
        $product = $this->makeProduct();
        $this->fillCart($user, [[$product, 1]]);
        $this->pincode();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'phone', 'address', 'city', 'state', 'pincode']);

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_repeated_submission_does_not_create_a_duplicate_order(): void
    {
        $user = User::factory()->create();
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

        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseCount('order_items', 1);
    }

    public function test_a_customer_cannot_spend_another_customers_cart(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $product = $this->makeProduct();
        $this->fillCart($owner, [[$product, 3]]);
        $this->pincode();

        $this->actingAs($other, 'sanctum')
            ->postJson('/api/orders', $this->address())
            ->assertStatus(422)
            ->assertJsonPath('message', 'Your cart is empty.');

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('cart_items', 1);
    }
}
