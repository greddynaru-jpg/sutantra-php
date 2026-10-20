<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds a single nullable self-referencing `parent_id` so product categories can
 * form exactly two levels:
 *
 *   - top-level / parent categories  → parent_id IS NULL
 *   - subcategories                  → parent_id points at one parent category
 *
 * Existing rows keep parent_id NULL, so every category that already exists
 * stays a top-level category and all existing product assignments are
 * unchanged. The change is additive and reversible.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_categories', function (Blueprint $table) {
            $table->unsignedBigInteger('parent_id')->nullable()->after('id');
            $table->index('parent_id');
        });

        // SQLite cannot add a foreign key to an existing table (and that is the
        // connection the test suite uses). Application logic still enforces the
        // relationship and the "no delete while dependents exist" rule.
        if (DB::connection()->getDriverName() !== 'sqlite') {
            Schema::table('product_categories', function (Blueprint $table) {
                $table->foreign('parent_id')
                    ->references('id')
                    ->on('product_categories')
                    ->restrictOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            Schema::table('product_categories', function (Blueprint $table) {
                $table->dropForeign(['parent_id']);
            });
        }

        Schema::table('product_categories', function (Blueprint $table) {
            $table->dropIndex(['parent_id']);
            $table->dropColumn('parent_id');
        });
    }
};
