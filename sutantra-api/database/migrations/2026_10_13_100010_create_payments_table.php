<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained('orders')->restrictOnDelete();
            $table->string('gateway', 50)->default('NONE');
            $table->string('payment_method', 30);
            $table->string('payment_reference', 100)->nullable();
            $table->string('gateway_order_id', 100)->nullable();
            $table->string('gateway_payment_id', 150)->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 10)->default('INR');
            $table->string('status', 20)->default('PENDING');
            $table->string('payment_status', 20)->default('PENDING'); // FAILED|PAID|PENDING|REFUNDED
            $table->string('provider_reference', 100)->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};