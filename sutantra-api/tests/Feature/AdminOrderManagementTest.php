<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminOrderManagementTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role = User::ROLE_USER): User
    {
        return User::factory()->create([
            'role' => $role,
            'phone' => fake()->unique()->numerify('9#########'),
        ]);
    }

    private function makeOrder(User $customer, array $overrides = []): Order
    {
        $createdAt = $overrides['created_at'] ?? null;
        unset($overrides['created_at']);

        $order = Order::create(array_merge([
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
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'customer_email' => $customer->email,
            'delivery_address' => '12-3, Green Street, Hyderabad',
        ], $overrides));

        if ($createdAt !== null) {
            $order->forceFill(['created_at' => $createdAt])->saveQuietly();
        }

        return $order;
    }

    public function test_admin_order_endpoints_enforce_authentication_and_role(): void
    {
        $this->getJson('/api/admin/orders')->assertUnauthorized();
        $this->getJson('/api/admin/orders/analytics')->assertUnauthorized();

        $customer = $this->makeUser();
        $this->actingAs($customer, 'sanctum')->getJson('/api/admin/orders')->assertForbidden();
        $this->actingAs($customer, 'sanctum')->getJson('/api/admin/orders/analytics')->assertForbidden();
    }

    public function test_admin_can_list_search_and_filter_orders_by_dynamic_status(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);
        $customer = $this->makeUser();

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/order-statuses', [
            'code' => 'ON_HOLD',
            'label' => 'On Hold',
        ])->assertStatus(201);

        $created = $this->makeOrder($customer, [
            'status' => Order::STATUS_CREATED,
            'created_at' => '2026-10-05 10:00:00',
        ]);
        $onHold = $this->makeOrder($customer, [
            'status' => 'ON_HOLD',
            'created_at' => '2026-10-06 11:00:00',
        ]);
        $this->makeOrder($customer, [
            'status' => 'LEGACY_STATUS',
            'created_at' => '2026-09-01 09:00:00',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/orders')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/orders?status=ON_HOLD&period=custom&date_from=2026-10-01&date_to=2026-10-31')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $onHold->id);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/orders?search='.$customer->phone)
            ->assertOk()
            ->assertJsonCount(3, 'data');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/orders?period=daily&anchor=2026-10-05')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $created->id);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/orders?period=custom&date_from=2026-10-10&date_to=2026-10-01')
            ->assertStatus(422);
    }

    public function test_analytics_are_database_driven_and_include_all_configured_and_legacy_statuses(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);
        $customer = $this->makeUser();

        OrderStatus::create([
            'code' => 'ON_HOLD',
            'label' => 'On Hold',
            'sort_order' => 7,
            'is_active' => true,
            'is_protected' => false,
        ]);
        OrderStatus::create([
            'code' => 'ARCHIVED',
            'label' => 'Archived',
            'sort_order' => 8,
            'is_active' => false,
            'is_protected' => false,
        ]);

        $this->makeOrder($customer, [
            'status' => Order::STATUS_CREATED,
            'payment_status' => Order::PAYMENT_PENDING,
            'total_amount' => 100,
            'created_at' => '2026-10-05 10:00:00',
        ]);
        $this->makeOrder($customer, [
            'status' => Order::STATUS_CONFIRMED,
            'payment_status' => Order::PAYMENT_PAID,
            'total_amount' => 200,
            'created_at' => '2026-10-05 12:00:00',
        ]);
        $this->makeOrder($customer, [
            'status' => Order::STATUS_CANCELLED,
            'payment_status' => Order::PAYMENT_REFUNDED,
            'total_amount' => 300,
            'created_at' => '2026-10-06 09:00:00',
        ]);
        $this->makeOrder($customer, [
            'status' => 'ON_HOLD',
            'payment_status' => Order::PAYMENT_PAID,
            'total_amount' => 400,
            'created_at' => '2026-10-06 10:00:00',
        ]);
        $this->makeOrder($customer, [
            'status' => 'LEGACY_STATUS',
            'payment_status' => Order::PAYMENT_PENDING,
            'total_amount' => 500,
            'created_at' => '2026-10-07 08:00:00',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/orders/analytics?period=monthly&anchor=2026-10-15')
            ->assertOk()
            ->assertJsonPath('summary.totalOrders', 5)
            ->assertJsonPath('summary.grossOrderValue', 1500)
            ->assertJsonPath('summary.paidAmount', 600)
            ->assertJsonPath('summary.refundedAmount', 300)
            ->assertJsonPath('summary.realizedRevenue', 600)
            ->assertJsonPath('summary.pendingPaymentAmount', 600)
            ->assertJsonPath('summary.cancelledOrderValue', 300)
            ->assertJsonPath('summary.averageOrderValue', 300)
            ->assertJsonPath('range.granularity', 'day');

        $breakdown = collect($response->json('statusBreakdown'))->keyBy('code');

        $this->assertSame(1, $breakdown['CREATED']['count']);
        $this->assertSame(1, $breakdown['CONFIRMED']['count']);
        $this->assertSame(1, $breakdown['CANCELLED']['count']);
        $this->assertSame(1, $breakdown['ON_HOLD']['count']);
        $this->assertSame(0, $breakdown['ARCHIVED']['count']);
        $this->assertSame(1, $breakdown['LEGACY_STATUS']['count']);
        $this->assertFalse($breakdown['LEGACY_STATUS']['is_configured']);
        $this->assertFalse($breakdown['ARCHIVED']['is_active']);
        $this->assertSame(20, $breakdown['ON_HOLD']['percentage']);
        $this->assertEqualsWithDelta(100.0, $breakdown->sum('percentage'), 0.1);

        $trend = collect($response->json('trend'));

        $this->assertCount(31, $trend);
        $this->assertSame(5, $trend->sum('count'));
        $this->assertEquals(1500, $trend->sum('value'));
    }

    public function test_analytics_periods_use_consistent_buckets(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);
        $customer = $this->makeUser();
        $this->makeOrder($customer, ['created_at' => '2026-10-25 12:00:00', 'total_amount' => 250]);

        $daily = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/orders/analytics?period=daily&anchor=2026-10-25')
            ->assertOk()
            ->assertJsonPath('range.granularity', 'hour');

        $this->assertCount(24, $daily->json('trend'));
        $this->assertSame(1, collect($daily->json('trend'))->sum('count'));

        $weekly = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/orders/analytics?period=weekly&anchor=2026-10-25')
            ->assertOk()
            ->assertJsonPath('range.granularity', 'day');

        $this->assertCount(7, $weekly->json('trend'));

        $yearly = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/orders/analytics?period=yearly&anchor=2026-10-25')
            ->assertOk()
            ->assertJsonPath('range.granularity', 'month');

        $this->assertCount(12, $yearly->json('trend'));

        $customDays = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/orders/analytics?period=custom&date_from=2026-10-01&date_to=2026-10-25')
            ->assertOk()
            ->assertJsonPath('range.granularity', 'day');

        $this->assertCount(25, $customDays->json('trend'));
        $this->assertSame(1, collect($customDays->json('trend'))->sum('count'));

        $customMonths = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/orders/analytics?period=custom&date_from=2026-01-15&date_to=2026-04-15')
            ->assertOk()
            ->assertJsonPath('range.granularity', 'month');

        $this->assertCount(4, $customMonths->json('trend'));
    }

    public function test_empty_analytics_are_safe(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/orders/analytics?period=monthly&anchor=2026-10-15')
            ->assertOk()
            ->assertJsonPath('summary.totalOrders', 0)
            ->assertJsonPath('summary.grossOrderValue', 0)
            ->assertJsonPath('summary.paidAmount', 0);

        $this->assertNotEmpty($response->json('statusBreakdown'));
        $this->assertSame(0, collect($response->json('statusBreakdown'))->sum('percentage'));
        $this->assertSame(0, collect($response->json('trend'))->sum('count'));
    }

    public function test_order_details_and_status_updates_preserve_existing_transition_rules(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);
        $customer = $this->makeUser();
        $order = $this->makeOrder($customer, ['status' => Order::STATUS_CREATED]);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $order->id)
            ->assertJsonPath('data.allowedTransitions', ['CONFIRMED', 'CANCELLED']);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'DELIVERED'])
            ->assertStatus(422);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'CONFIRMED'])
            ->assertOk()
            ->assertJsonPath('data.status', 'CONFIRMED')
            ->assertJsonPath('data.allowedTransitions', ['PROCESSING', 'SHIPPED', 'CANCELLED']);

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'CONFIRMED']);
    }
}
