<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

    public function index(Request $request): JsonResponse
    {
        $query = Order::query()->with('items')->orderByDesc('created_at');

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->date('date'));
        }

        $orders = $query->paginate(20);

        $stats = [
            'total' => Order::count(),
            'pending' => Order::where('status', 'CREATED')->count(),
            'confirmed' => Order::whereIn('status', ['CONFIRMED', 'PROCESSING'])->count(),
            'dispatched' => Order::where('status', 'SHIPPED')->count(),
            'delivered' => Order::where('status', 'DELIVERED')->count(),
        ];

        return response()->json([
            'data' => OrderResource::collection($orders)->response()->getData(true),
            'stats' => $stats,
        ]);
    }

    public function show(Order $order): JsonResponse
    {
        $order->load('items');

        return (new OrderResource($order))->response();
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string'],
        ]);

        $current = strtoupper($order->status);
        $next = strtoupper($data['status']);

        if ($current === $next) {
            return (new OrderResource($order->fresh('items')))->response();
        }

        $allowed = self::ALLOWED_TRANSITIONS[$current] ?? [];

        if (! in_array($next, $allowed, true)) {
            throw ValidationException::withMessages([
                'status' => ['This status transition is not allowed.'],
            ]);
        }

        $order->status = $next;
        $order->save();

        return (new OrderResource($order->fresh('items')))->response();
    }
}
