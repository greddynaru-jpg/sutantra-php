<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Offer codes (Phase 1: admin-only management).
 *
 * Purely additive: this creates a single new table and never touches an
 * existing one, so historical orders/carts keep the discount figures they
 * already store. `down()` drops only this table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offer_codes', function (Blueprint $table) {
            $table->id();
            // The application stores codes upper-cased, so this unique index
            // also blocks concurrent, case-variant duplicates.
            $table->string('code', 50)->unique();
            $table->string('description', 500)->nullable();
            // PERCENTAGE or FIXED (validated in the form request).
            $table->string('discount_type', 20);
            $table->decimal('discount_value', 10, 2);
            $table->decimal('min_order_amount', 10, 2)->default(0);
            // Only meaningful for percentage offers; null for fixed amounts.
            $table->decimal('max_discount', 10, 2)->nullable();
            $table->date('starts_at')->nullable();
            $table->date('expires_at')->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('per_customer_limit')->nullable();
            $table->unsignedInteger('used_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offer_codes');
    }
};
