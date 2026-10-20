<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Dashboard split and password permissions.
 *
 * - ADMIN manages products, categories and customer (USER) accounts.
 * - ADMIN may never change any password, not even its own, and may not create,
 *   modify or delete administrator accounts, nor reach the home-page endpoints
 *   (enforced server-side, so a direct API call cannot bypass the hidden UI).
 * - SUPER_ADMIN changes passwords through the user-management workflow.
 * - Privileged role changes and the last super admin are protected.
 */
class AdminAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role): User
    {
        return User::factory()->create([
            'role' => $role,
            'phone' => fake()->unique()->numerify('9#########'),
        ]);
    }

    /** Keeps the account's own unique email/phone so validation passes. */
    private function profilePayload(User $user, array $extra = []): array
    {
        return array_merge([
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
        ], $extra);
    }

    /** Full user-management payload for an existing account. */
    private function userPayload(User $user, array $extra = []): array
    {
        return array_merge([
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
        ], $extra);
    }

    // ── Password permissions (§4) ───────────────────────────────────

    public function test_admin_cannot_change_their_own_password(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);

        $this->actingAs($admin, 'sanctum')->putJson('/api/auth/profile', $this->profilePayload($admin, [
            'password' => 'brand-new-secret',
            'password_confirmation' => 'brand-new-secret',
        ]))->assertStatus(403);

        // The stored hash is untouched.
        $this->assertTrue(Hash::check('password', $admin->fresh()->password));
    }

    public function test_admin_can_still_update_profile_details_without_a_password(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);

        $this->actingAs($admin, 'sanctum')->putJson('/api/auth/profile', [
            'name' => 'Renamed Admin',
            'email' => $admin->email,
            'phone' => $admin->phone,
        ])->assertOk()->assertJsonPath('user.name', 'Renamed Admin');

        $this->assertTrue(Hash::check('password', $admin->fresh()->password));
    }

    public function test_customer_can_change_their_own_password(): void
    {
        $customer = $this->makeUser(User::ROLE_USER);

        $this->actingAs($customer, 'sanctum')->putJson('/api/auth/profile', $this->profilePayload($customer, [
            'password' => 'customer-secret-1',
            'password_confirmation' => 'customer-secret-1',
        ]))->assertOk();

        $this->assertTrue(Hash::check('customer-secret-1', $customer->fresh()->password));
    }

    public function test_super_admin_can_change_their_own_password(): void
    {
        $super = $this->makeUser(User::ROLE_SUPER_ADMIN);

        $this->actingAs($super, 'sanctum')->putJson('/api/auth/profile', $this->profilePayload($super, [
            'password' => 'super-secret-1',
            'password_confirmation' => 'super-secret-1',
        ]))->assertOk();

        $this->assertTrue(Hash::check('super-secret-1', $super->fresh()->password));
    }

    public function test_super_admin_can_change_another_users_password_via_user_management(): void
    {
        $super = $this->makeUser(User::ROLE_SUPER_ADMIN);
        $target = $this->makeUser(User::ROLE_USER);

        $this->actingAs($super, 'sanctum')->putJson("/api/admin/users/{$target->id}", $this->userPayload($target, [
            'password' => 'reset-by-super',
        ]))->assertOk();

        $this->assertTrue(Hash::check('reset-by-super', $target->fresh()->password));
    }

    public function test_admin_cannot_change_another_users_password_via_direct_api_request(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);
        $target = $this->makeUser(User::ROLE_USER);

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/users/{$target->id}", $this->userPayload($target, [
            'password' => 'should-not-apply',
        ]))->assertForbidden();

        $this->assertTrue(Hash::check('password', $target->fresh()->password));
    }

    public function test_admin_can_reach_the_users_module(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/users')->assertOk();
    }

    public function test_admin_can_create_and_manage_customer_accounts(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/users', [
            'name' => 'Created by admin',
            'email' => 'created-by-admin@example.com',
            'phone' => '9876500001',
            'password' => 'secret-123',
            'role' => User::ROLE_USER,
        ])->assertStatus(201);

        $created = User::where('email', 'created-by-admin@example.com')->firstOrFail();
        $this->assertSame(User::ROLE_USER, $created->role);

        // Admin may edit customer details without touching the password.
        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/users/{$created->id}", [
            'name' => 'Renamed Customer',
            'email' => $created->email,
            'phone' => $created->phone,
            'role' => User::ROLE_USER,
        ])->assertOk();

        $this->assertSame('Renamed Customer', $created->fresh()->name);

        // And may delete a customer with no carts/orders.
        $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/users/{$created->id}")->assertOk();
        $this->assertDatabaseMissing('users', ['id' => $created->id]);
    }

    public function test_admin_cannot_create_privileged_accounts(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/users', [
            'name' => 'Sneaky Super',
            'email' => 'sneaky-super@example.com',
            'phone' => '9876500002',
            'password' => 'secret-123',
            'role' => User::ROLE_SUPER_ADMIN,
        ])->assertForbidden();

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/users', [
            'name' => 'Sneaky Admin',
            'email' => 'sneaky-admin@example.com',
            'phone' => '9876500003',
            'password' => 'secret-123',
            'role' => User::ROLE_ADMIN,
        ])->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'sneaky-super@example.com']);
        $this->assertDatabaseMissing('users', ['email' => 'sneaky-admin@example.com']);
    }

    public function test_admin_cannot_modify_or_delete_administrator_accounts(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);
        $otherAdmin = $this->makeUser(User::ROLE_ADMIN);
        $super = $this->makeUser(User::ROLE_SUPER_ADMIN);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/users/{$otherAdmin->id}", $this->userPayload($otherAdmin))
            ->assertForbidden();
        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/users/{$otherAdmin->id}")->assertForbidden();
        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/users/{$super->id}", $this->userPayload($super))->assertForbidden();
        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/users/{$super->id}")->assertForbidden();

        $this->assertDatabaseHas('users', ['id' => $otherAdmin->id, 'role' => User::ROLE_ADMIN]);
        $this->assertDatabaseHas('users', ['id' => $super->id, 'role' => User::ROLE_SUPER_ADMIN]);
    }

    public function test_admin_cannot_promote_anyone_to_super_admin(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);
        $target = $this->makeUser(User::ROLE_USER);

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/users/{$target->id}", $this->userPayload($target, [
            'role' => User::ROLE_SUPER_ADMIN,
        ]))->assertForbidden();

        $this->assertFalse($target->fresh()->isSuperAdmin());
        $this->assertDatabaseHas('users', ['id' => $target->id, 'role' => User::ROLE_USER]);
    }

    // ── Dashboard split (§3) ────────────────────────────────────────

    public function test_admin_keeps_products_and_categories_but_loses_home_page_modules(): void
    {
        $admin = $this->makeUser(User::ROLE_ADMIN);

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/products')->assertOk();
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/categories')->assertOk();

        // Banners / vision / policies are Super-Admin-only modules.
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/banners')->assertForbidden();
        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/banners', ['title' => 'Nope'])->assertForbidden();
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/vision')->assertForbidden();
        $this->actingAs($admin, 'sanctum')->putJson('/api/admin/vision', ['content' => 'x'])->assertForbidden();
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/policies')->assertForbidden();
    }

    public function test_super_admin_keeps_access_to_the_home_page_modules(): void
    {
        $super = $this->makeUser(User::ROLE_SUPER_ADMIN);

        $this->actingAs($super, 'sanctum')->getJson('/api/admin/products')->assertOk();
        $this->actingAs($super, 'sanctum')->getJson('/api/admin/categories')->assertOk();
        $this->actingAs($super, 'sanctum')->getJson('/api/admin/banners')->assertOk();
        $this->actingAs($super, 'sanctum')->getJson('/api/admin/vision')->assertOk();
        $this->actingAs($super, 'sanctum')->getJson('/api/admin/policies')->assertOk();
        $this->actingAs($super, 'sanctum')->getJson('/api/admin/users')->assertOk();
    }

    // ── User-management guards (§5) ─────────────────────────────────

    public function test_the_only_super_admin_cannot_demote_deactivate_or_delete_itself(): void
    {
        $only = $this->makeUser(User::ROLE_SUPER_ADMIN);

        $this->actingAs($only, 'sanctum')->putJson("/api/admin/users/{$only->id}", $this->userPayload($only, [
            'role' => User::ROLE_USER,
        ]))->assertStatus(422);

        $this->actingAs($only, 'sanctum')->putJson("/api/admin/users/{$only->id}", $this->userPayload($only, [
            'is_active' => false,
        ]))->assertStatus(422);

        $this->actingAs($only, 'sanctum')->deleteJson("/api/admin/users/{$only->id}")->assertStatus(422);

        $fresh = $only->fresh();
        $this->assertTrue($fresh->isSuperAdmin());
        $this->assertTrue($fresh->is_active);
    }

    public function test_a_second_super_admin_may_be_demoted_when_another_stays_active(): void
    {
        $actor = $this->makeUser(User::ROLE_SUPER_ADMIN);
        $target = $this->makeUser(User::ROLE_SUPER_ADMIN);

        $this->actingAs($actor, 'sanctum')->putJson("/api/admin/users/{$target->id}", $this->userPayload($target, [
            'role' => User::ROLE_ADMIN,
        ]))->assertOk();

        $this->assertSame(User::ROLE_ADMIN, $target->fresh()->role);
    }

    // ── Authentication still works (§8) ─────────────────────────────

    public function test_guests_cannot_touch_the_password_or_user_endpoints(): void
    {
        $this->putJson('/api/auth/profile', [
            'name' => 'X',
            'email' => 'x@example.com',
            'phone' => '9111111111',
            'password' => 'secret-123',
            'password_confirmation' => 'secret-123',
        ])->assertUnauthorized();

        $this->getJson('/api/admin/users')->assertUnauthorized();
        $this->getJson('/api/admin/banners')->assertUnauthorized();
    }
}
