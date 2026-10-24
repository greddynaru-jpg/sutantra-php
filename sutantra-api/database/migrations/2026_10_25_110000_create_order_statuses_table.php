<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_statuses', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('label', 100);
            $table->string('description', 255)->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_protected')->default(false);
            $table->timestamps();
        });

        $statuses = [
            ['code' => 'CREATED', 'label' => 'Pending Approval', 'sort_order' => 1, 'is_protected' => true],
            ['code' => 'CONFIRMED', 'label' => 'Approved', 'sort_order' => 2, 'is_protected' => true],
            ['code' => 'PROCESSING', 'label' => 'Processing', 'sort_order' => 3, 'is_protected' => true],
            ['code' => 'SHIPPED', 'label' => 'Dispatched', 'sort_order' => 4, 'is_protected' => true],
            ['code' => 'DELIVERED', 'label' => 'Delivered', 'sort_order' => 5, 'is_protected' => true],
            ['code' => 'CANCELLED', 'label' => 'Cancelled', 'sort_order' => 6, 'is_protected' => true],
        ];

        foreach ($statuses as $status) {
            DB::table('order_statuses')->insert([
                'code' => $status['code'],
                'label' => $status['label'],
                'description' => null,
                'sort_order' => $status['sort_order'],
                'is_active' => true,
                'is_protected' => $status['is_protected'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('order_statuses');
    }
};
