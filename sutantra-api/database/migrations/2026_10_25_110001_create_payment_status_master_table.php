<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_status_master', function (Blueprint $table) {
            $table->id();
            $table->string('status_code', 50)->unique();
            $table->string('display_name', 100);
            $table->string('description', 255)->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $statuses = [
            ['status_code' => 'PENDING', 'display_name' => 'Pending', 'description' => 'Payment is pending.', 'sort_order' => 1],
            ['status_code' => 'PAID', 'display_name' => 'Paid', 'description' => 'Payment completed successfully.', 'sort_order' => 2],
            ['status_code' => 'FAILED', 'display_name' => 'Failed', 'description' => 'Payment failed.', 'sort_order' => 3],
            ['status_code' => 'REFUNDED', 'display_name' => 'Refunded', 'description' => 'Payment refunded.', 'sort_order' => 4],
        ];

        foreach ($statuses as $status) {
            DB::table('payment_status_master')->insert([
                'status_code' => $status['status_code'],
                'display_name' => $status['display_name'],
                'description' => $status['description'],
                'sort_order' => $status['sort_order'],
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_status_master');
    }
};
