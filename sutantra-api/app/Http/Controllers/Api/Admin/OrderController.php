<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderStatus;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    private const ALLOWED_TRANSITIONS = [
        'CREATED' => ['CONFIRMED', 'CANCELLED'],
        'CONFIRMED' => ['PROCESSING', 'SHIPPED', 'CANCELLED'],
        'PROCESSING' => ['SHIPPED', 'CANCELLED'],
        'SHIPPED' => ['DELIVERED', 'CANCELLED'],
        'DELIVERED' => [],
        'CANCELLED' => [],
    ];

    private const PERIODS = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];

    /**
     * Paginated order list. Every filter is optional, so a direct API call
     * without a period returns all orders rather than a silently restricted set.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'max:30'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = Order::query()
            ->withCount('items')
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%")
                    ->orWhere('customer_email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', strtoupper(trim((string) $request->input('status'))));
        }

        $range = $this->resolveRange($request, false);

        if ($range !== null) {
            [$from, $to] = $this->databaseBounds($range);
            $query->whereBetween('created_at', [$from, $to]);
        }

        $orders = $query->paginate((int) $request->input('per_page', 20))->withQueryString();

        return OrderResource::collection($orders)->response();
    }

    /**
     * Database-derived dashboard aggregates for the selected period. The
     * response intentionally includes every configured status (including
     * zero-count and inactive ones) plus legacy status codes found on orders.
     */
    public function analytics(Request $request): JsonResponse
    {
        $range = $this->resolveRange($request, true);
        [$from, $to] = $this->databaseBounds($range);

        $timezone = config('app.timezone') ?: 'UTC';
        $todayStart = CarbonImmutable::now($timezone)->startOfDay()->utc();
        $todayEnd = CarbonImmutable::now($timezone)->endOfDay()->utc();

        $base = Order::query()->whereBetween('created_at', [$from, $to]);

        $summary = (clone $base)
            ->selectRaw('COUNT(*) as total_orders')
            ->selectRaw('COALESCE(SUM(total_amount), 0) as gross_order_value')
            ->selectRaw("COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END), 0) as paid_amount")
            ->selectRaw("COALESCE(SUM(CASE WHEN payment_status = 'REFUNDED' THEN total_amount ELSE 0 END), 0) as refunded_amount")
            ->selectRaw("COALESCE(SUM(CASE WHEN payment_status = 'PAID' AND status <> 'CANCELLED' THEN total_amount ELSE 0 END), 0) as realized_revenue")
            ->selectRaw("COALESCE(SUM(CASE WHEN payment_status = 'PENDING' THEN total_amount ELSE 0 END), 0) as pending_payment_amount")
            ->selectRaw("COALESCE(SUM(CASE WHEN status = 'CANCELLED' THEN total_amount ELSE 0 END), 0) as cancelled_order_value")
            ->first();

        $totalOrders = (int) $summary->total_orders;
        $grossOrderValue = (float) $summary->gross_order_value;

        $todayOrders = Order::query()
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        $statusRows = (clone $base)
            ->selectRaw('status, COUNT(*) as aggregate, COALESCE(SUM(total_amount), 0) as value')
            ->groupBy('status')
            ->get();

        $statusCounts = [];

        foreach ($statusRows as $row) {
            $code = strtoupper(trim((string) $row->status)) ?: 'UNKNOWN';
            $statusCounts[$code] = [
                'count' => (int) $row->aggregate,
                'value' => (float) $row->value,
            ];
        }

        $statusBreakdown = [];
        $seen = [];

        foreach (OrderStatus::query()->orderBy('sort_order')->orderBy('id')->get() as $definition) {
            $code = strtoupper(trim((string) $definition->code));

            if ($code === '' || isset($seen[$code])) {
                continue;
            }

            $seen[$code] = true;
            $count = $statusCounts[$code]['count'] ?? 0;
            $value = $statusCounts[$code]['value'] ?? 0.0;

            $statusBreakdown[] = [
                'id' => $definition->id,
                'code' => $code,
                'label' => $definition->label,
                'is_active' => (bool) $definition->is_active,
                'is_protected' => (bool) $definition->is_protected,
                'is_configured' => true,
                'count' => $count,
                'value' => $value,
                'percentage' => $totalOrders > 0 ? round(($count / $totalOrders) * 100, 1) : 0.0,
            ];
        }

        // Historical orders may reference a status that was later removed from
        // the configuration table. Keep those visible instead of dropping them.
        foreach ($statusCounts as $code => $counts) {
            if (isset($seen[$code])) {
                continue;
            }

            $statusBreakdown[] = [
                'id' => null,
                'code' => $code,
                'label' => $code,
                'is_active' => true,
                'is_protected' => false,
                'is_configured' => false,
                'count' => $counts['count'],
                'value' => $counts['value'],
                'percentage' => $totalOrders > 0 ? round(($counts['count'] / $totalOrders) * 100, 1) : 0.0,
            ];
        }

        $trendRows = (clone $base)
            ->selectRaw($this->trendBucketExpression($range['granularity']).' as bucket, COUNT(*) as aggregate, COALESCE(SUM(total_amount), 0) as value')
            ->groupByRaw($this->trendBucketExpression($range['granularity']))
            ->orderBy('bucket')
            ->get();

        return response()->json([
            'range' => [
                'preset' => $range['preset'],
                'from' => $range['from']->toDateString(),
                'to' => $range['to']->toDateString(),
                'label' => $range['label'],
                'granularity' => $range['granularity'],
                'timezone' => $timezone,
            ],
            'summary' => [
                'totalOrders' => $totalOrders,
                'todayOrders' => $todayOrders,
                'grossOrderValue' => $grossOrderValue,
                'paidAmount' => (float) $summary->paid_amount,
                'refundedAmount' => (float) $summary->refunded_amount,
                'realizedRevenue' => (float) $summary->realized_revenue,
                'pendingPaymentAmount' => (float) $summary->pending_payment_amount,
                'cancelledOrderValue' => (float) $summary->cancelled_order_value,
                'averageOrderValue' => $totalOrders > 0 ? round($grossOrderValue / $totalOrders, 2) : 0.0,
            ],
            'statusBreakdown' => $statusBreakdown,
            'trend' => $this->buildTrend($range, $trendRows),
            'generatedAt' => now()->toISOString(),
        ]);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        return $this->orderResponse($order);
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string'],
        ]);

        $current = strtoupper($order->status);
        $next = strtoupper($data['status']);

        if ($current === $next) {
            return $this->orderResponse($order->fresh());
        }

        $allowed = self::ALLOWED_TRANSITIONS[$current] ?? [];

        if (! in_array($next, $allowed, true)) {
            throw ValidationException::withMessages([
                'status' => ['This status transition is not allowed.'],
            ]);
        }

        $order->status = $next;
        $order->save();

        return $this->orderResponse($order->fresh());
    }

    /**
     * Shared shape for the admin detail view: the regular order resource plus
     * the transitions the API will actually accept for the current status.
     */
    private function orderResponse(Order $order): JsonResponse
    {
        $order->loadMissing('items');

        $data = (new OrderResource($order))->resolve(request());
        $data['allowedTransitions'] = self::ALLOWED_TRANSITIONS[strtoupper((string) $order->status)] ?? [];

        return response()->json(['data' => $data]);
    }

    /**
     * Resolve a preset period or explicit custom range in the application
     * timezone, returning inclusive day boundaries and the chart granularity.
     */
    private function resolveRange(Request $request, bool $defaultToCurrentMonth): ?array
    {
        $data = $request->validate([
            'period' => ['nullable', Rule::in(self::PERIODS)],
            'anchor' => ['nullable', 'date_format:Y-m-d'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $period = $data['period'] ?? null;
        $dateFrom = $data['date_from'] ?? null;
        $dateTo = $data['date_to'] ?? null;
        $legacyDate = $data['date'] ?? null;

        $hasInput = $period !== null || $dateFrom !== null || $dateTo !== null || $legacyDate !== null;

        if (! $hasInput && ! $defaultToCurrentMonth) {
            return null;
        }

        if (($dateFrom === null) !== ($dateTo === null)) {
            throw ValidationException::withMessages([
                'date_from' => ['Choose both a start date and an end date.'],
            ]);
        }

        if ($period === null || $period === 'custom') {
            if ($dateFrom !== null && $dateTo !== null) {
                $period = 'custom';
            } elseif ($legacyDate !== null) {
                $period = 'daily';
            } elseif ($period === null) {
                $period = $defaultToCurrentMonth ? 'monthly' : null;
            }
        }

        $timezone = config('app.timezone') ?: 'UTC';
        $anchor = isset($data['anchor'])
            ? CarbonImmutable::parse($data['anchor'], $timezone)
            : CarbonImmutable::now($timezone);

        if ($period === null) {
            return null;
        }

        switch ($period) {
            case 'daily':
                $from = $legacyDate !== null && ($data['anchor'] ?? null) === null
                    ? CarbonImmutable::parse($legacyDate, $timezone)
                    : $anchor;
                $from = $from->startOfDay();
                $to = $from->endOfDay();
                $granularity = 'hour';
                $label = $from->format('d M Y');
                break;

            case 'weekly':
                $from = $anchor->startOfWeek(CarbonInterface::MONDAY)->startOfDay();
                $to = $from->endOfWeek(CarbonInterface::SUNDAY)->endOfDay();
                $granularity = 'day';
                $label = $from->format('d M Y').' – '.$to->format('d M Y');
                break;

            case 'monthly':
                $from = $anchor->startOfMonth()->startOfDay();
                $to = $anchor->endOfMonth()->endOfDay();
                $granularity = 'day';
                $label = $from->format('F Y');
                break;

            case 'yearly':
                $from = $anchor->startOfYear()->startOfDay();
                $to = $anchor->endOfYear()->endOfDay();
                $granularity = 'month';
                $label = $from->format('Y');
                break;

            default:
                if ($dateFrom === null || $dateTo === null) {
                    throw ValidationException::withMessages([
                        'date_from' => ['A start date and an end date are required for a custom range.'],
                    ]);
                }

                $from = CarbonImmutable::parse($dateFrom, $timezone)->startOfDay();
                $to = CarbonImmutable::parse($dateTo, $timezone)->endOfDay();

                if ($from->greaterThan($to)) {
                    throw ValidationException::withMessages([
                        'date_to' => ['The end date must be on or after the start date.'],
                    ]);
                }

                // Keep custom charts readable: daily points for short ranges,
                // monthly points for longer ones, instead of returning hundreds
                // of unreadable daily ticks.
                $granularity = $from->diffInDays($to) <= 62 ? 'day' : 'month';
                $label = $from->format('d M Y').' – '.$to->format('d M Y');
                break;
        }

        return [
            'preset' => $period,
            'from' => $from,
            'to' => $to,
            'granularity' => $granularity,
            'label' => $label,
        ];
    }

    private function databaseBounds(array $range): array
    {
        return [$range['from']->utc(), $range['to']->utc()];
    }

    private function trendBucketExpression(string $granularity): string
    {
        return match ($granularity) {
            'hour' => "DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00')",
            'month' => "DATE_FORMAT(created_at, '%Y-%m')",
            default => 'DATE(created_at)',
        };
    }

    private function buildTrend(array $range, $rows): array
    {
        $byBucket = [];

        foreach ($rows as $row) {
            $byBucket[(string) $row->bucket] = [
                'count' => (int) $row->aggregate,
                'value' => (float) $row->value,
            ];
        }

        $points = [];

        if ($range['granularity'] === 'hour') {
            $cursor = $range['from']->startOfDay();

            for ($i = 0; $i < 24; $i++) {
                $key = $cursor->format('Y-m-d H:00:00');
                $points[] = $this->trendPoint($key, $cursor->format('H:00'), $cursor->format('d M Y, H:00'), $byBucket);
                $cursor = $cursor->addHour();
            }
        } elseif ($range['granularity'] === 'month') {
            $cursor = $range['from']->startOfMonth();

            while ($cursor->lessThanOrEqualTo($range['to'])) {
                $key = $cursor->format('Y-m');
                $points[] = $this->trendPoint($key, $cursor->format('M Y'), $cursor->format('F Y'), $byBucket);
                $cursor = $cursor->addMonth();
            }
        } else {
            $cursor = $range['from']->startOfDay();

            while ($cursor->lessThanOrEqualTo($range['to'])) {
                $key = $cursor->format('Y-m-d');
                $points[] = $this->trendPoint($key, $cursor->format('d M'), $cursor->format('d M Y'), $byBucket);
                $cursor = $cursor->addDay();
            }
        }

        return $points;
    }

    private function trendPoint(string $key, string $label, string $fullLabel, array $byBucket): array
    {
        $bucket = $byBucket[$key] ?? ['count' => 0, 'value' => 0.0];

        return [
            'key' => $key,
            'label' => $label,
            'fullLabel' => $fullLabel,
            'count' => $bucket['count'],
            'value' => $bucket['value'],
        ];
    }
}
