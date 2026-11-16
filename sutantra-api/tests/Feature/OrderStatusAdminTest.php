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
            ->assertJsonFragment(['code' => 'ORDER_PLACED']);
    }

    public function test_admin_can_add_an_order_status(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/order-statuses', [
                'code' => 'custom_hold',
                'label' => 'Custom Hold',
                'description' => 'Awaiting stock',
                'sort_order' => 99,
                'is_active' => true,
            ])
            ->assertStatus(201)
            ->assertJsonPath('code', 'CUSTOM_HOLD')
            ->assertJsonPath('label', 'Custom Hold')
            ->assertJsonPath('is_protected', false);

        $this->assertDatabaseHas('order_status_master', [
            'code' => 'CUSTOM_HOLD',
            'label' => 'Custom Hold',
            'is_protected' => false,
        ]);
    }

    public function test_admin_can_update_and_deactivate_a_custom_order_status(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);

        $created = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/order-statuses', [
                'code' => 'CUSTOM_HOLD',
                'label' => 'Custom Hold',
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

        // Master records are not physically deleted; deactivate endpoint/behavior is used instead.
        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/order-statuses/{$created['id']}/active", ['is_active' => true])
            ->assertOk()
            ->assertJsonPath('is_active', true);

        $this->assertDatabaseHas('order_status_master', ['id' => $created['id'], 'code' => 'CUSTOM_HOLD']);
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
