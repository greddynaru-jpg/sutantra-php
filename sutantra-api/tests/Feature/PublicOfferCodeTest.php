<?php

namespace Tests\Feature;

use App\Models\OfferCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Public, read-only offers endpoint used by the homepage marquee.
 *
 * Covers eligibility (active window + usage limit) and the deliberately
 * narrow, customer-facing payload. All fields here are pre-existing; this
 * endpoint adds no schema of its own.
 */
class PublicOfferCodeTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function offer(array $overrides = []): OfferCode
    {
        return OfferCode::create(array_merge([
            'code' => 'WELCOME10',
            'description' => 'Welcome offer',
            'discount_type' => OfferCode::TYPE_PERCENTAGE,
            'discount_value' => 10,
            'min_order_amount' => 500,
            'max_discount' => null,
            'starts_at' => null,
            'expires_at' => null,
            'usage_limit' => null,
            'per_customer_limit' => null,
            'used_count' => 0,
            'is_active' => true,
        ], $overrides));
    }

    public function test_guests_can_read_available_offers(): void
    {
        $this->offer();

        $response = $this->getJson('/api/catalog/offers')
            ->assertOk()
            ->assertJsonPath('data.0.code', 'WELCOME10')
            ->assertJsonPath('data.0.description', 'Welcome offer')
            ->assertJsonPath('data.0.discountType', OfferCode::TYPE_PERCENTAGE);

        $this->assertSame(10.0, (float) $response->json('data.0.discountValue'));
        $this->assertSame(500.0, (float) $response->json('data.0.minOrderAmount'));
    }

    public function test_inactive_offers_are_hidden(): void
    {
        $this->offer(['is_active' => false]);

        $this->getJson('/api/catalog/offers')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_offers_outside_their_window_are_hidden(): void
    {
        $this->offer(['code' => 'EXPIRED', 'expires_at' => now()->subDay()->toDateString()]);
        $this->offer(['code' => 'FUTURE', 'starts_at' => now()->addDay()->toDateString()]);

        $this->getJson('/api/catalog/offers')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_open_ended_and_current_offers_are_shown(): void
    {
        $this->offer(['code' => 'OPENS', 'starts_at' => now()->subDay()->toDateString()]);
        $this->offer(['code' => 'LASTDAY', 'expires_at' => now()->toDateString()]);
        $this->offer(['code' => 'NODATES']);

        $response = $this->getJson('/api/catalog/offers')->assertOk();

        $this->assertEqualsCanonicalizing(
            ['OPENS', 'LASTDAY', 'NODATES'],
            array_column($response->json('data'), 'code'),
        );
    }

    public function test_exhausted_offers_are_hidden(): void
    {
        $this->offer([
            'code' => 'USEDUP',
            'usage_limit' => 5,
            'used_count' => 5,
        ]);
        $this->offer([
            'code' => 'STILLOK',
            'usage_limit' => 5,
            'used_count' => 4,
        ]);

        $this->getJson('/api/catalog/offers')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'STILLOK');
    }

    public function test_administrative_fields_are_not_exposed(): void
    {
        $this->offer([
            'usage_limit' => 100,
            'per_customer_limit' => 1,
            'used_count' => 3,
        ]);

        $offer = $this->getJson('/api/catalog/offers')->assertOk()->json('data.0');

        $this->assertSame(
            [
                'code',
                'description',
                'discountType',
                'discountValue',
                'minOrderAmount',
                'startsAt',
                'expiresAt',
            ],
            array_keys($offer),
        );
    }

    public function test_offers_are_returned_newest_first(): void
    {
        $this->offer(['code' => 'FIRST']);
        $this->offer(['code' => 'SECOND']);

        $response = $this->getJson('/api/catalog/offers')->assertOk();

        $this->assertSame(['SECOND', 'FIRST'], array_column($response->json('data'), 'code'));
    }
}
