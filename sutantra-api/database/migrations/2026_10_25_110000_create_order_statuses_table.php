<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_status_master', function (Blueprint $table) {
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
            ['code' => 'ORDER_PLACED', 'label' => 'Order Placed', 'description' => 'Customer has successfully placed the order.', 'sort_order' => 1, 'is_protected' => false],
            ['code' => 'ORDER_CONFIRMED', 'label' => 'Order Confirmed', 'description' => 'Order has been reviewed and accepted by the business.', 'sort_order' => 2, 'is_protected' => false],
            ['code' => 'PROCESSING', 'label' => 'Processing', 'description' => 'Order is being processed for fulfilment.', 'sort_order' => 3, 'is_protected' => false],
            ['code' => 'PREPARING', 'label' => 'Preparing', 'description' => 'Food items are being freshly prepared.', 'sort_order' => 4, 'is_protected' => false],
            ['code' => 'READY_FOR_PICKUP', 'label' => 'Ready for Pickup', 'description' => 'Order is packed and ready for pickup or dispatch.', 'sort_order' => 5, 'is_protected' => false],
            ['code' => 'OUT_FOR_DELIVERY', 'label' => 'Out for Delivery', 'description' => 'Order has been dispatched to the customer.', 'sort_order' => 6, 'is_protected' => false],
            ['code' => 'DELIVERED', 'label' => 'Delivered', 'description' => 'Order has been successfully delivered.', 'sort_order' => 7, 'is_protected' => false],
            ['code' => 'CANCELLED', 'label' => 'Cancelled', 'description' => 'Order has been cancelled.', 'sort_order' => 8, 'is_protected' => false],
            ['code' => 'ON_HOLD', 'label' => 'On Hold', 'description' => 'Order processing is temporarily paused.', 'sort_order' => 9, 'is_protected' => false],
        ];

        foreach ($statuses as $status) {
            DB::table('order_status_master')->insert([
                'code' => $status['code'],
                'label' => $status['label'],
                'description' => $status['description'],
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
        Schema::dropIfExists('order_status_master');
    }
};
