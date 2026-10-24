<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderStatusController extends Controller
{
    public function index(): JsonResponse
    {
        $statuses = OrderStatus::query()->orderBy('sort_order')->get();

        return response()->json($statuses);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:30', 'alpha_dash', Rule::unique('order_statuses', 'code')],
            'label' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $status = OrderStatus::create([
            'code' => strtoupper($data['code']),
            'label' => $data['label'],
            'description' => $data['description'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
            'is_protected' => false,
        ]);

        return response()->json($status, 201);
    }

    public function update(Request $request, OrderStatus $orderStatus): JsonResponse
    {
        $data = $request->validate([
            'label' => ['sometimes', 'required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (isset($data['label'])) {
            $orderStatus->label = $data['label'];
        }
        if (array_key_exists('description', $data)) {
            $orderStatus->description = $data['description'];
        }
        if (isset($data['sort_order'])) {
            $orderStatus->sort_order = $data['sort_order'];
        }
        if (isset($data['is_active'])) {
            if ($orderStatus->is_protected && ! $data['is_active']) {
                throw ValidationException::withMessages([
                    'is_active' => ['Protected workflow statuses cannot be deactivated.'],
                ]);
            }
            $orderStatus->is_active = $data['is_active'];
        }

        $orderStatus->save();

        return response()->json($orderStatus);
    }

    public function destroy(OrderStatus $orderStatus): JsonResponse
    {
        if ($orderStatus->is_protected) {
            throw ValidationException::withMessages([
                'status' => ['Protected workflow statuses cannot be deleted.'],
            ]);
        }

        $inUse = Order::query()->where('status', $orderStatus->code)->exists();

        if ($inUse) {
            throw ValidationException::withMessages([
                'status' => ['This status is used by existing orders and cannot be deleted. Deactivate it instead.'],
            ]);
        }

        $orderStatus->delete();

        return response()->json(['success' => true]);
    }
}
