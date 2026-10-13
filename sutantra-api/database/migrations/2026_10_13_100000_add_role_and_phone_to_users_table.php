<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extend the default Laravel users table with the Sutantra auth model:
 * phone (second login identifier), role, is_active, verification_code (preserved
 * from the legacy schema but no longer used for login).
 *
 * Documented change (see data-preservation report): `name` becomes nullable so
 * users registered by email/phone only do not require a display name.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('name', 150)->nullable()->change();
            $table->string('phone', 15)->nullable()->unique()->after('email');
            $table->string('role', 20)->default('USER')->after('phone');
            $table->boolean('is_active')->default(true)->after('role');
            $table->string('verification_code', 10)->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['phone']);
            $table->dropColumn(['verification_code', 'is_active', 'role', 'phone']);
            $table->string('name')->change();
        });
    }
};