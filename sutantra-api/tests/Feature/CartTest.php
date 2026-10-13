<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartTest extends TestCase
{
    use RefreshDatabase;

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

    private function user(): User
    {
        return User::factory()->create();
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/cart')->assertUnauthorized();
        $this->postJson('/api/cart/items', ['productId' => 1, 'quantity' => 1])->assertUnauthorized();
    }

    public function test_add_available_product_returns_cart_with_item_and_total(): void
    {
        $user = $this->user();
        $product = $this->makeProduct(['price' => 180.00, 'stock_quantity' => 10]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/cart/items', ['productId' => $product->id, 'quantity' => 2]);

        $response->assertOk()
            ->assertJsonPath('data.items.0.productId', $product->id)
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.items.0.subtotal', 360)
            ->assertJsonPath('data.totalAmount', 360)
            ->assertJsonPath('data.totalQuantity', 2);

        $this->assertDatabaseHas('cart_items', [
            'product_id' => $product->id,
            'quantity' => 2,
        ]);
    }

    public function test_adding_same_product_updates_quantity_without_duplicating(): void
    {
        $user = $this->user();
        $product = $this->makeProduct(['stock_quantity' => 10]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/cart/items', ['productId' => $product->id, 'quantity' => 2])
            ->assertOk();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/cart/items', ['productId' => $product->id, 'quantity' => 3]);

        $response->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.quantity', 5);

        $this->assertSame(1, CartItem::query()->where('product_id', $product->id)->count());
    }

    public function test_adding_different_products_creates_distinct_lines(): void
    {
        $user = $this->user();
        $a = $this->makeProduct();
        $b = $this->makeProduct();

        $this->actingAs($user, 'sanctum')->postJson('/api/cart/items', ['productId' => $a->id, 'quantity' => 1])->assertOk();
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cart/items', ['productId' => $b->id, 'quantity' => 1]);

        $response->assertOk()->assertJsonCount(2, 'data.items');
    }

    public function test_frontend_query_parameter_contract_is_accepted(): void
    {
        // api.js sends productId/quantity as query parameters on a POST.
        $user = $this->user();
        $product = $this->makeProduct();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/cart/items?productId={$product->id}&quantity=1");

        $response->assertOk()->assertJsonPath('data.items.0.quantity', 1);
    }

    public function test_invalid_or_missing_product_is_rejected(): void
    {
        $user = $this->user();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/cart/items', ['productId' => 999999, 'quantity' => 1])
            ->assertStatus(422)
            ->assertJsonValidationErrors('productId');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/cart/items', ['quantity' => 1])
            ->assertStatus(422)
            ->assertJsonValidationErrors('productId');
    }

    public function test_zero_or_negative_quantity_is_rejected(): void
    {
        $user = $this->user();
        $product = $this->makeProduct();

        foreach ([0, -1] as $bad) {
            $this->actingAs($user, 'sanctum')
                ->postJson('/api/cart/items', ['productId' => $product->id, 'quantity' => $bad])
                ->assertStatus(422)
                ->assertJsonValidationErrors('quantity');
        }

        $this->assertSame(0, CartItem::query()->count());
    }

    public function test_unavailable_product_is_rejected(): void
    {
        $user = $this->user();
        $product = $this->makeProduct(['available' => false]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/cart/items', ['productId' => $product->id, 'quantity' => 1])
            ->assertStatus(422)
            ->assertJsonValidationErrors('productId');

        $this->assertSame(0, CartItem::query()->count());
    }

    public function test_out_of_stock_product_is_rejected(): void
    {
        $user = $this->user();
        $product = $this->makeProduct(['stock_quantity' => 0]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/cart/items', ['productId' => $product->id, 'quantity' => 1])
            ->assertStatus(422)
            ->assertJsonValidationErrors('productId');
    }

    public function test_quantity_exceeding_stock_is_rejected(): void
    {
        $user = $this->user();
        $product = $this->makeProduct(['stock_quantity' => 3]);

        // Adding more than the stock in one go.
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/cart/items', ['productId' => $product->id, 'quantity' => 4])
            ->assertStatus(422)
            ->assertJsonValidationErrors('quantity');

        // Adding within stock, then exceeding the remaining stock.
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/cart/items', ['productId' => $product->id, 'quantity' => 3])
            ->assertOk();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/cart/items', ['productId' => $product->id, 'quantity' => 1])
            ->assertStatus(422)
            ->assertJsonValidationErrors('quantity');

        $this->assertSame(3, (int) CartItem::query()->first()->quantity);
    }

    public function test_a_user_cannot_touch_another_users_cart_item(): void
    {
        $owner = $this->user();
        $intruder = $this->user();
        $product = $this->makeProduct();

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/cart/items', ['productId' => $product->id, 'quantity' => 2])
            ->assertOk();

        $item = CartItem::query()->firstOrFail();

        $this->actingAs($intruder, 'sanctum')
            ->patchJson("/api/cart/items/{$item->id}/increase")
            ->assertNotFound();

        $this->actingAs($intruder, 'sanctum')
            ->deleteJson("/api/cart/items/{$item->id}")
            ->assertNotFound();

        $this->assertSame(2, (int) $item->fresh()->quantity);
    }

    public function test_each_user_sees_only_their_own_cart(): void
    {
        $a = $this->user();
        $b = $this->user();
        $product = $this->makeProduct();

        $this->actingAs($a, 'sanctum')->postJson('/api/cart/items', ['productId' => $product->id, 'quantity' => 2])->assertOk();

        $this->actingAs($b, 'sanctum')->getJson('/api/cart')
            ->assertOk()
            ->assertJsonPath('data.items', [])
            ->assertJsonPath('data.totalQuantity', 0);
    }

    public function test_increase_decrease_remove_and_clear(): void
    {
        $user = $this->user();
        $a = $this->makeProduct(['stock_quantity' => 5]);
        $b = $this->makeProduct(['stock_quantity' => 5]);

        $this->actingAs($user, 'sanctum')->postJson('/api/cart/items', ['productId' => $a->id, 'quantity' => 1])->assertOk();
        $this->actingAs($user, 'sanctum')->postJson('/api/cart/items', ['productId' => $b->id, 'quantity' => 1])->assertOk();

        $itemA = CartItem::query()->where('product_id', $a->id)->firstOrFail();

        // increase
        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/cart/items/{$itemA->id}/increase")
            ->assertOk()
            ->assertJsonPath('data.totalQuantity', 3);

        // decrease
        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/cart/items/{$itemA->id}/decrease")
            ->assertOk()
            ->assertJsonPath('data.totalQuantity', 2);

        // remove one line
        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/cart/items/{$itemA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data.items');

        // clear the rest
        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/cart')
            ->assertOk()
            ->assertJsonCount(0, 'data.items')
            ->assertJsonPath('data.totalAmount', 0);

        $this->assertSame(0, CartItem::query()->count());
    }

    public function test_decreasing_last_unit_removes_the_line(): void
    {
        $user = $this->user();
        $product = $this->makeProduct();

        $this->actingAs($user, 'sanctum')->postJson('/api/cart/items', ['productId' => $product->id, 'quantity' => 1])->assertOk();
        $item = CartItem::query()->firstOrFail();

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/cart/items/{$item->id}/decrease")
            ->assertOk()
            ->assertJsonCount(0, 'data.items');

        $this->assertDatabaseMissing('cart_items', ['id' => $item->id]);
    }

    public function test_show_does_not_create_a_cart(): void
    {
        $user = $this->user();

        $this->actingAs($user, 'sanctum')->getJson('/api/cart')
            ->assertOk()
            ->assertJsonPath('data.items', [])
            ->assertJsonPath('data.id', null);

        $this->assertSame(0, Cart::query()->count());
    }
}
