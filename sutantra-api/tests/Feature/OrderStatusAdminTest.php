<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderStatusAdminTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role): User
    {
        return User::factory()->create([
            'role' => $role,
            'phone' => fake()->unique()->numerify('9#########'),
        ]);
    }

    public function test_admin_can_list_order_statuses(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/order-statuses')
            ->assertOk()
            ->assertJsonFragment(['code' => 'CREATED']);
    }

    public function test_admin_can_add_an_order_status(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/order-statuses', [
                'code' => 'on_hold',
                'label' => 'On Hold',
                'description' => 'Awaiting stock',
                'sort_order' => 7,
                'is_active' => true,
            ])
            ->assertStatus(201)
            ->assertJsonPath('code', 'ON_HOLD')
            ->assertJsonPath('label', 'On Hold')
            ->assertJsonPath('is_protected', false);

        $this->assertDatabaseHas('order_statuses', [
            'code' => 'ON_HOLD',
            'label' => 'On Hold',
            'is_protected' => false,
        ]);
    }

    public function test_admin_can_update_and_delete_a_custom_order_status(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);

        $created = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/order-statuses', [
                'code' => 'ON_HOLD',
                'label' => 'On Hold',
            ])
            ->assertStatus(201)
            ->json();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/order-statuses/{$created['id']}", [
                'label' => 'Waiting',
                'is_active' => false,
            ])
            ->assertOk()
            ->assertJsonPath('label', 'Waiting')
            ->assertJsonPath('is_active', false);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/order-statuses/{$created['id']}")
            ->assertOk();

        $this->assertDatabaseMissing('order_statuses', ['id' => $created['id']]);
    }

    public function test_order_status_endpoints_keep_their_access_rules(): void
    {
        $this->getJson('/api/admin/order-statuses')->assertUnauthorized();

        $customer = $this->makeUser(User::ROLE_USER);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/admin/order-statuses')
            ->assertForbidden();
    }
}
