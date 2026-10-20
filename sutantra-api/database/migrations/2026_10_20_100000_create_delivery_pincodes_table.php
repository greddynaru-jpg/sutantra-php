<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Database-backed delivery serviceability + per-PIN delivery charge.
 *
 * A row means the PIN code is known to the business. Orders are only accepted
 * for rows that are `active`. The delivery charge lives with the PIN code, so
 * no pricing policy is hard-coded in the application.
 *
 * This migration intentionally seeds no rows: the real serviceability list is
 * business data and must be populated by the owner before checkout is usable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_pincodes', function (Blueprint $table) {
            $table->id();
            $table->string('pincode', 10)->unique();
            $table->decimal('delivery_charge', 10, 2)->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index('active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_pincodes');
    }
};
