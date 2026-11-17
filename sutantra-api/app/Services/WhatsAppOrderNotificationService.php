<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderStatus;
use App\Models\WhatsAppNotification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;

/**
 * Sends order-related WhatsApp notifications through the existing SpringEdge
 * integration, without changing the working OTP delivery path.
 *
 * Design rules enforced here:
 *  - SpringEdge is never called inside an open database transaction (callers
 *    invoke this service after their transaction has committed).
 *  - A provider failure never throws into the order/status flow; it is logged
 *    and recorded for investigation/retry.
 *  - Every event is tracked with a unique (order, event_key) row, so repeats of
 *    the same event cannot produce a duplicate successful notification.
 *  - Order templates use body parameters only; the OTP authentication-button
 *    payload is intentionally not reused here.
 */
class WhatsAppOrderNotificationService
{
    /**
     * Send the approved `order_confirmed` template (name, order number, amount)
     * and, only after the provider accepts it, a separate invoice-link message.
     */
    public function sendOrderConfirmation(Order $order): void
    {
        try {
            $record = $this->begin(
                $order,
                WhatsAppNotification::EVENT_ORDER_CONFIRMED,
                WhatsAppNotification::EVENT_ORDER_CONFIRMED,
                $this->templateName('order_confirmed')
            );

            if ($record === null) {
                // Confirmation already accepted. Allow a previously failed
                // invoice follow-up to be retried without duplicating the
                // confirmation message itself.
                $this->sendInvoiceUrl($order);
                return;
            }

            $recipient = $this->recipientFor($order);
            if ($recipient === null) {
                $this->finishSkipped($record, 'No valid registered mobile number for this order.');
                return;
            }

            $record->forceFill(['recipient' => $recipient])->save();

            $result = $this->sendTemplateMessage(
                $recipient,
                (string) $record->template_name,
                [
                    $this->customerName($order),
                    (string) $order->order_number,
                    number_format((float) $order->total_amount, 2, '.', ''),
                ],
                $this->templateLanguage('order_confirmed')
            );

            $this->finish($record, $result);

            if (($result['success'] ?? false) === true) {
                $this->sendInvoiceUrl($order);
            }
        } catch (\Throwable $e) {
            $this->logException('order_confirmed', $order, $e);
        }
    }

    /**
     * Send the approved `order_status_update` template after a validated,
     * persisted status change. `event_key` includes the transition so later
     * legitimate transitions each notify once.
     */
    public function sendOrderStatusUpdate(Order $order, string $previousStatus, string $newStatus): void
    {
        try {
            $previous = strtoupper(trim($previousStatus));
            $current = strtoupper(trim($newStatus));

            if ($previous === '' || $current === '' || $previous === $current) {
                return;
            }

            $eventKey = WhatsAppNotification::EVENT_ORDER_STATUS_UPDATED.':'.$previous.'>'.$current;

            $record = $this->begin(
                $order,
                WhatsAppNotification::EVENT_ORDER_STATUS_UPDATED,
                $eventKey,
                $this->templateName('order_status_update')
            );

            if ($record === null) {
                return;
            }

            $recipient = $this->recipientFor($order);
            if ($recipient === null) {
                $this->finishSkipped($record, 'No valid registered mobile number for this order.');
                return;
            }

            $record->forceFill(['recipient' => $recipient])->save();

            $result = $this->sendTemplateMessage(
                $recipient,
                (string) $record->template_name,
                [
                    $this->customerName($order),
                    (string) $order->order_number,
                    $this->statusDisplayName($current),
                ],
                $this->templateLanguage('order_status_update')
            );

            $this->finish($record, $result);
        } catch (\Throwable $e) {
            $this->logException('order_status_updated', $order, $e);
        }
    }

    /**
     * Send the invoice link as a plain text message. Only runs when the
     * application already exposes a secure named invoice route; the service
     * never invents or hardcodes an invoice URL.
     */
    public function sendInvoiceUrl(Order $order): void
    {
        try {
            $url = $this->resolveInvoiceUrl($order);

            if ($url === null) {
                Log::warning('WhatsApp invoice link skipped: no secure invoice route is available.', [
                    'order_id' => $order->id,
                ]);
                return;
            }

            $record = $this->begin(
                $order,
                WhatsAppNotification::EVENT_ORDER_INVOICE_LINK,
                WhatsAppNotification::EVENT_ORDER_CONFIRMED.':INVOICE',
                'text'
            );

            if ($record === null) {
                return;
            }

            $recipient = $this->recipientFor($order);
            if ($recipient === null) {
                $this->finishSkipped($record, 'No valid registered mobile number for this order.');
                return;
            }

            $record->forceFill(['recipient' => $recipient])->save();

            $result = $this->sendTextMessage(
                $recipient,
                "Invoice for order {$order->order_number}: {$url}"
            );

            $this->finish($record, $result);
        } catch (\Throwable $e) {
            $this->logException('order_invoice_link', $order, $e);
        }
    }

    /**
     * Send a reusable body-parameter template message.
     *
     * @param  list<string|int|float>  $parameters
     * @return array{success: bool, status: int, message_id: string|null, error: string|null}
     */
    public function sendTemplateMessage(
        string $recipient,
        string $templateName,
        array $parameters,
        ?string $language = null
    ): array {
        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $recipient,
            'type' => 'template',
            'template' => [
                'name' => $templateName,
                'language' => ['code' => $language ?? (string) config('services.whatsapp.language', 'en')],
                'components' => [
                    [
                        'type' => 'body',
                        'parameters' => array_map(
                            fn ($value): array => ['type' => 'text', 'text' => (string) $value],
                            array_values($parameters)
                        ),
                    ],
                ],
            ],
        ];

        return $this->post($payload);
    }

    /**
     * @return array{success: bool, status: int, message_id: string|null, error: string|null}
     */
    public function sendTextMessage(string $recipient, string $text): array
    {
        return $this->post([
            'messaging_product' => 'whatsapp',
            'to' => $recipient,
            'type' => 'text',
            'text' => [
                'preview_url' => false,
                'body' => $text,
            ],
        ]);
    }

    /**
     * Normalize an Indian mobile number for SpringEdge/WhatsApp:
     *  - 10-digit local mobile -> prefix 91
     *  - 12-digit number beginning 91 -> retained
     * Anything else is treated as invalid and no message is sent.
     */
    public function normalizeRecipient(?string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $phone);

        if (! is_string($digits) || $digits === '') {
            return null;
        }

        if (strlen($digits) === 10) {
            return preg_match('/^[6-9]\d{9}$/', $digits) === 1 ? '91'.$digits : null;
        }

        if (strlen($digits) === 12 && str_starts_with($digits, '91')) {
            return preg_match('/^91[6-9]\d{9}$/', $digits) === 1 ? $digits : null;
        }

        return null;
    }

    /**
     * Prefer the registered customer mobile attached to the order's user;
     * fall back to the order's own stored contact number. Never accepts a phone
     * number from the current request.
     */
    public function recipientFor(Order $order): ?string
    {
        $userPhone = null;

        try {
            $userPhone = $order->user?->phone;
        } catch (\Throwable) {
            $userPhone = null;
        }

        return $this->normalizeRecipient($userPhone)
            ?? $this->normalizeRecipient($order->customer_phone);
    }

    /**
     * Customer-facing status label from the existing master table, falling back
     * to a readable form of the status code.
     */
    public function statusDisplayName(string $status): string
    {
        $code = strtoupper(trim($status));

        if ($code === '') {
            return 'Updated';
        }

        $label = OrderStatus::query()->where('code', $code)->value('label');

        if (is_string($label) && trim($label) !== '') {
            return trim($label);
        }

        return ucwords(strtolower(str_replace('_', ' ', $code)));
    }

    /**
     * @return array{success: bool, status: int, message_id: string|null, error: string|null}
     */
    private function post(array $payload): array
    {
        $url = $this->endpoint();
        $apiKey = trim((string) config('services.whatsapp.api_key', ''));

        if ($url === null || $apiKey === '') {
            Log::warning('WhatsApp order notification skipped: configuration is incomplete.');

            return [
                'success' => false,
                'status' => 0,
                'message_id' => null,
                'error' => 'WhatsApp configuration is incomplete.',
            ];
        }

        try {
            $request = Http::timeout((int) config('services.whatsapp.timeout', 15))
                ->withHeaders([
                    'apikey' => $apiKey,
                    'Content-Type' => 'application/json',
                ])
                ->acceptJson();

            // SSL verification stays enabled. An optional custom CA bundle is
            // used only when it points to a readable file; otherwise the
            // platform trust store is used.
            $caBundle = trim((string) config('services.whatsapp.ca_bundle', ''));

            if ($caBundle !== '') {
                if (is_file($caBundle) && is_readable($caBundle)) {
                    $request = $request->withOptions(['verify' => $caBundle]);
                } else {
                    Log::warning('WhatsApp CA bundle is configured but not readable; using the default trust store.');
                }
            }

            $response = $request->post($url, $payload);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'status' => $response->status(),
                    'message_id' => $response->json('messages.0.id'),
                    'error' => null,
                ];
            }

            $safeBody = preg_replace('/\s+/', ' ', (string) $response->body());
            $safeBody = mb_substr($safeBody ?? '', 0, 300);

            return [
                'success' => false,
                'status' => $response->status(),
                'message_id' => null,
                'error' => 'HTTP '.$response->status().': '.$safeBody,
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'status' => 0,
                'message_id' => null,
                'error' => get_class($e).': '.mb_substr((string) $e->getMessage(), 0, 300),
            ];
        }
    }

    /**
     * Reuse the existing SpringEdge URL convention:
     * POST {WHATSAPP_SERVICE_URL}/v3/{WHATSAPP_PHONE_NUMBER_ID}/messages.
     */
    private function endpoint(): ?string
    {
        $serviceUrl = trim((string) config('services.whatsapp.service_url', ''));
        $phoneNumberId = trim((string) config('services.whatsapp.phone_number_id', ''));

        if ($serviceUrl === '' || $phoneNumberId === '') {
            return null;
        }

        $baseUrl = rtrim($serviceUrl, '/');
        $url = str_replace('{{phone_number_id}}', $phoneNumberId, $baseUrl);

        if (! str_contains($url, '/messages')) {
            return rtrim($url, '/').'/v3/'.$phoneNumberId.'/messages';
        }

        if (! str_contains($baseUrl, '{{phone_number_id}}')
            && ! preg_match('#/v3/'.preg_quote($phoneNumberId, '#').'/messages$#', $url)) {
            return rtrim($baseUrl, '/').'/v3/'.$phoneNumberId.'/messages';
        }

        return $url;
    }

    private function templateName(string $key): string
    {
        $fallback = $key === 'order_status_update' ? 'order_status_update' : 'order_confirmed';
        $name = trim((string) config("services.whatsapp.templates.{$key}", ''));

        return $name !== '' ? $name : $fallback;
    }

    /**
     * Approved language for a specific template, falling back to the shared
     * WhatsApp template language.
     */
    private function templateLanguage(string $key): string
    {
        $language = trim((string) config("services.whatsapp.template_languages.{$key}", ''));

        if ($language !== '') {
            return $language;
        }

        $fallback = trim((string) config('services.whatsapp.language', 'en'));

        return $fallback !== '' ? $fallback : 'en';
    }

    private function customerName(Order $order): string
    {
        $name = trim((string) ($order->customer_name ?? ''));

        if ($name === '') {
            try {
                $name = trim((string) ($order->user?->name ?? ''));
            } catch (\Throwable) {
                $name = '';
            }
        }

        return $name !== '' ? $name : 'Customer';
    }

    /**
     * Create (or reopen) the tracking row for this event. Returns null when the
     * event has already been submitted successfully, which prevents duplicates.
     */
    private function begin(Order $order, string $eventType, string $eventKey, string $templateName): ?WhatsAppNotification
    {
        $record = WhatsAppNotification::query()->firstOrCreate(
            ['order_id' => $order->id, 'event_key' => $eventKey],
            [
                'event_type' => $eventType,
                'template_name' => $templateName,
                'status' => WhatsAppNotification::STATUS_PENDING,
                'attempts' => 0,
            ]
        );

        if ($record->status === WhatsAppNotification::STATUS_SUBMITTED) {
            return null;
        }

        $record->forceFill([
            'event_type' => $eventType,
            'template_name' => $templateName,
            'status' => WhatsAppNotification::STATUS_PENDING,
            'provider_message_id' => null,
            'failure_reason' => null,
            'attempts' => ((int) $record->attempts) + 1,
            'attempted_at' => now(),
        ])->save();

        return $record;
    }

    /**
     * @param  array{success: bool, status: int, message_id: string|null, error: string|null}  $result
     */
    private function finish(WhatsAppNotification $record, array $result): void
    {
        $success = (bool) ($result['success'] ?? false);

        $record->forceFill([
            'status' => $success
                ? WhatsAppNotification::STATUS_SUBMITTED
                : WhatsAppNotification::STATUS_FAILED,
            'provider_message_id' => $success ? ($result['message_id'] ?? null) : null,
            'failure_reason' => $success
                ? null
                : mb_substr((string) ($result['error'] ?? 'Unknown provider error.'), 0, 500),
            'attempted_at' => now(),
        ])->save();

        if (! $success) {
            // Never log recipient details or message parameters.
            Log::warning('WhatsApp order notification failed.', [
                'notification_id' => $record->id,
                'order_id' => $record->order_id,
                'event_type' => $record->event_type,
                'provider_status' => $result['status'] ?? null,
            ]);
        }
    }

    private function finishSkipped(WhatsAppNotification $record, string $reason): void
    {
        $record->forceFill([
            'status' => WhatsAppNotification::STATUS_SKIPPED,
            'failure_reason' => mb_substr($reason, 0, 500),
            'attempted_at' => now(),
        ])->save();

        Log::warning('WhatsApp order notification skipped.', [
            'notification_id' => $record->id,
            'order_id' => $record->order_id,
            'event_type' => $record->event_type,
        ]);
    }

    private function resolveInvoiceUrl(Order $order): ?string
    {
        if (! Route::has('orders.invoice')) {
            return null;
        }

        try {
            return route('orders.invoice', ['order' => $order->id]);
        } catch (\Throwable $e) {
            Log::warning('WhatsApp invoice URL could not be generated.', [
                'order_id' => $order->id,
                'type' => get_class($e),
            ]);

            return null;
        }
    }

    private function logException(string $event, Order $order, \Throwable $e): void
    {
        Log::warning('WhatsApp order notification exception.', [
            'event' => $event,
            'order_id' => $order->id,
            'type' => get_class($e),
            'message' => mb_substr((string) $e->getMessage(), 0, 300),
        ]);
    }
}
