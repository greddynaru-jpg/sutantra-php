<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lightweight, idempotent tracking for outbound order WhatsApp notifications.
 *
 * One row per (order, event). `event_key` distinguishes order confirmation
 * (ORDER_CONFIRMED) from each individual status transition
 * (ORDER_STATUS_UPDATED:FROM>TO) and the invoice-link follow-up
 * (ORDER_CONFIRMED:INVOICE), so a legitimate later transition can still send
 * its own notification while repeats of the same event are suppressed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('event_type', 50);
            $table->string('event_key', 100);
            $table->string('template_name', 100);
            $table->string('recipient', 20)->nullable();
            $table->string('status', 20)->default('PENDING');
            $table->string('provider_message_id', 100)->nullable();
            $table->string('failure_reason', 500)->nullable();
            $table->unsignedInteger('attempts')->default(0);
            $table->timestamp('attempted_at')->nullable();
            $table->timestamps();

            $table->unique(['order_id', 'event_key']);
            $table->index(['order_id', 'event_type']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_notifications');
    }
};
