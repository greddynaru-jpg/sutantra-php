<?php

namespace Tests\Feature;

use App\Models\OfferCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Offer Codes administration (Phase 1).
 *
 * Covers authorization, validation, code normalisation/uniqueness, the
 * activate/deactivate actions, search/status filters and persistence. There is
 * deliberately no delete endpoint, so offers are preserved.
 */
class OfferCodeAdminTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => User::ROLE_ADMIN]);
    }

    private function superAdmin(): User
    {
        return User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
    }

    private function customer(): User
    {
        return User::factory()->create(['role' => User::ROLE_USER]);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'code' => 'WELCOME10',
            'description' => 'Welcome offer',
            'discount_type' => OfferCode::TYPE_PERCENTAGE,
            'discount_value' => 10,
            'min_order_amount' => 500,
            'max_discount' => 100,
            'starts_at' => '2026-01-01',
            'expires_at' => '2026-12-31',
            'usage_limit' => 100,
            'per_customer_limit' => 1,
            'is_active' => true,
        ], $overrides);
    }

    // ── Authorization ────────────────────────────────────────────────

    public function test_guests_are_rejected(): void
    {
        $this->getJson('/api/admin/offers')->assertUnauthorized();
        $this->postJson('/api/admin/offers', $this->payload())->assertUnauthorized();
    }

    public function test_only_administrators_may_manage_offers(): void
    {
        $customer = $this->customer();

        $this->actingAs($customer, 'sanctum')->getJson('/api/admin/offers')->assertForbidden();
        $this->actingAs($customer, 'sanctum')->postJson('/api/admin/offers', $this->payload())->assertForbidden();
        $this->assertSame(0, OfferCode::query()->count());
    }

    // ── Create / list / view ─────────────────────────────────────────

    public function test_admin_can_create_list_and_view_an_offer(): void
    {
        $admin = $this->admin();

        $created = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', $this->payload());

        $created->assertCreated()
            ->assertJsonPath('data.code', 'WELCOME10')
            ->assertJsonPath('data.discountType', OfferCode::TYPE_PERCENTAGE)
            ->assertJsonPath('data.isActive', true)
            ->assertJsonPath('data.usageLimit', 100);

        $id = $created->json('data.id');
        $this->assertDatabaseHas('offer_codes', ['id' => $id, 'code' => 'WELCOME10', 'is_active' => true]);

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/offers')
            ->assertOk()->assertJsonCount(1, 'data');

        $this->actingAs($admin, 'sanctum')->getJson("/api/admin/offers/{$id}")
            ->assertOk()->assertJsonPath('data.code', 'WELCOME10');
    }

    public function test_super_admin_can_manage_offers(): void
    {
        $super = $this->superAdmin();

        $this->actingAs($super, 'sanctum')->postJson('/api/admin/offers', $this->payload())->assertCreated();
        $this->actingAs($super, 'sanctum')->getJson('/api/admin/offers')->assertOk()->assertJsonCount(1, 'data');
    }

    // ── Normalisation & uniqueness ───────────────────────────────────

    public function test_code_is_trimmed_and_upper_cased(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/offers', $this->payload(['code' => '  spring-sale  ']))
            ->assertCreated()
            ->assertJsonPath('data.code', 'SPRING-SALE');

        $this->assertDatabaseHas('offer_codes', ['code' => 'SPRING-SALE']);
    }

    public function test_duplicate_codes_are_rejected(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', $this->payload(['code' => 'DUP10']))
            ->assertCreated();

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', $this->payload(['code' => 'DUP10']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('code');

        $this->assertSame(1, OfferCode::query()->where('code', 'DUP10')->count());
    }

    public function test_case_variant_codes_are_rejected(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', $this->payload(['code' => 'welcome10']))
            ->assertCreated();

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', $this->payload(['code' => 'WeLcOmE10']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('code');

        $this->assertSame(1, OfferCode::query()->count());
    }

    public function test_database_index_blocks_direct_duplicate_writes(): void
    {
        OfferCode::create([
            'code' => 'INDEXED',
            'discount_type' => OfferCode::TYPE_FIXED,
            'discount_value' => 10,
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        OfferCode::create([
            'code' => 'INDEXED',
            'discount_type' => OfferCode::TYPE_FIXED,
            'discount_value' => 20,
        ]);
    }

    // ── Validation ───────────────────────────────────────────────────

    public function test_missing_required_fields_are_rejected(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['code', 'discount_type', 'discount_value']);

        $this->assertSame(0, OfferCode::query()->count());
    }

    public function test_invalid_code_characters_are_rejected(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', $this->payload(['code' => 'BAD CODE!']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('code');
    }

    public function test_invalid_discount_values_are_rejected(): void
    {
        $admin = $this->admin();

        // Zero and negative amounts are not allowed.
        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', $this->payload(['discount_value' => 0]))
            ->assertStatus(422)->assertJsonValidationErrors('discount_value');
        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', $this->payload(['discount_value' => -5]))
            ->assertStatus(422)->assertJsonValidationErrors('discount_value');

        // A percentage cannot exceed 100.
        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', $this->payload(['discount_value' => 150]))
            ->assertStatus(422)->assertJsonValidationErrors('discount_value');

        // The same value is fine for a fixed amount.
        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', $this->payload([
            'discount_type' => OfferCode::TYPE_FIXED,
            'discount_value' => 150,
            'max_discount' => null,
        ]))->assertCreated();

        $this->assertSame(1, OfferCode::query()->count());
    }

    public function test_invalid_discount_type_is_rejected(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', $this->payload(['discount_type' => 'BOGUS']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('discount_type');
    }

    public function test_invalid_date_range_is_rejected(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', $this->payload([
            'starts_at' => '2026-12-31',
            'expires_at' => '2026-01-01',
        ]))->assertStatus(422)->assertJsonValidationErrors('expires_at');

        $this->assertSame(0, OfferCode::query()->count());
    }

    public function test_invalid_usage_limits_are_rejected(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', $this->payload(['usage_limit' => 0]))
            ->assertStatus(422)->assertJsonValidationErrors('usage_limit');

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', $this->payload(['per_customer_limit' => 0]))
            ->assertStatus(422)->assertJsonValidationErrors('per_customer_limit');

        $this->assertSame(0, OfferCode::query()->count());
    }

    // ── Field behaviour ──────────────────────────────────────────────

    public function test_max_discount_is_cleared_for_fixed_offers(): void
    {
        $admin = $this->admin();

        $created = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', $this->payload([
            'discount_type' => OfferCode::TYPE_FIXED,
            'discount_value' => 200,
            'max_discount' => 50,
        ]))->assertCreated();

        $this->assertNull($created->json('data.maxDiscount'));
        $this->assertDatabaseHas('offer_codes', ['id' => $created->json('data.id'), 'max_discount' => null]);
    }

    // ── Update & activate/deactivate ─────────────────────────────────

    public function test_offer_can_be_updated(): void
    {
        $admin = $this->admin();
        $id = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', $this->payload())->json('data.id');

        $response = $this->actingAs($admin, 'sanctum')->putJson("/api/admin/offers/{$id}", $this->payload([
            'discount_value' => 20,
            'is_active' => false,
        ]));

        $response->assertOk()->assertJsonPath('data.isActive', false);
        $this->assertSame(20.0, (float) $response->json('data.discountValue'));
        $this->assertDatabaseHas('offer_codes', ['id' => $id, 'discount_value' => 20, 'is_active' => false]);
    }

    public function test_offer_can_be_deactivated_and_reactivated(): void
    {
        $admin = $this->admin();
        $id = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/offers', $this->payload(['is_active' => true]))->json('data.id');

        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/offers/{$id}/deactivate")
            ->assertOk()->assertJsonPath('data.isActive', false);
        $this->assertDatabaseHas('offer_codes', ['id' => $id, 'is_active' => false]);

        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/offers/{$id}/activate")
            ->assertOk()->assertJsonPath('data.isActive', true);
        $this->assertDatabaseHas('offer_codes', ['id' => $id, 'is_active' => true]);
    }

    // ── Search & status filters ──────────────────────────────────────

    public function test_search_matches_code_case_insensitively(): void
    {
        $admin = $this->admin();

        OfferCode::create(['code' => 'SAVE10', 'discount_type' => OfferCode::TYPE_PERCENTAGE, 'discount_value' => 10, 'is_active' => true]);
        OfferCode::create(['code' => 'FLAT50', 'discount_type' => OfferCode::TYPE_FIXED, 'discount_value' => 50, 'is_active' => false]);

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/offers?search=SAVE')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.code', 'SAVE10');

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/offers?search=save')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.code', 'SAVE10');
    }

    public function test_status_filter_returns_only_matching_offers(): void
    {
        $admin = $this->admin();

        OfferCode::create(['code' => 'ACTIVE1', 'discount_type' => OfferCode::TYPE_PERCENTAGE, 'discount_value' => 10, 'is_active' => true]);
        OfferCode::create(['code' => 'OFFER1', 'discount_type' => OfferCode::TYPE_FIXED, 'discount_value' => 50, 'is_active' => false]);

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/offers?status=active')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.code', 'ACTIVE1');

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/offers?status=inactive')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.code', 'OFFER1');
    }

    // ── No destructive endpoint ──────────────────────────────────────

    public function test_offers_cannot_be_deleted(): void
    {
        $admin = $this->admin();
        $id = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/offers', $this->payload())->json('data.id');

        $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/offers/{$id}")->assertStatus(405);
        $this->assertDatabaseHas('offer_codes', ['id' => $id]);
    }
}
