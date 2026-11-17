<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Submission record for an outbound order WhatsApp notification.
 *
 * This is deliberately a submission log, not a duplicate of any provider
 * feature: it exists so the application can suppress duplicate events and keep
 * safe diagnostics for failed sends.
 */
class WhatsAppNotification extends Model
{
    use HasFactory;

    protected $table = 'whatsapp_notifications';

    public const EVENT_ORDER_CONFIRMED = 'ORDER_CONFIRMED';

    public const EVENT_ORDER_STATUS_UPDATED = 'ORDER_STATUS_UPDATED';

    public const EVENT_ORDER_INVOICE_LINK = 'ORDER_INVOICE_LINK';

    public const STATUS_PENDING = 'PENDING';

    public const STATUS_SUBMITTED = 'SUBMITTED';

    public const STATUS_FAILED = 'FAILED';

    public const STATUS_SKIPPED = 'SKIPPED';

    protected $fillable = [
        'order_id',
        'event_type',
        'event_key',
        'template_name',
        'recipient',
        'status',
        'provider_message_id',
        'failure_reason',
        'attempts',
        'attempted_at',
    ];

    protected function casts(): array
    {
        return [
            'attempted_at' => 'datetime',
            'attempts' => 'integer',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
