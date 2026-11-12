<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\OrderStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderStatusController extends Controller
{
    /**
     * GET /api/admin/order-statuses
     * Dynamic list from order_status_master (single source of truth).
     */
    public function index(Request $request): JsonResponse
    {
        $query = OrderStatus::query();

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('label', 'like', "%{$search}%");
            });
        }

        if ($request->filled('active')) {
            $active = filter_var($request->input('active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($active !== null) {
                $query->where('is_active', $active);
            }
        }

        $query->orderBy('sort_order')->orderBy('id');

        // Keep backward-compatible default (full list) while supporting pagination when requested.
        if ($request->filled('per_page')) {
            $perPage = max(1, min(100, (int) $request->input('per_page', 15)));
            return response()->json($query->paginate($perPage)->withQueryString());
        }

        return response()->json($query->get());
    }

    public function show(OrderStatus $orderStatus): JsonResponse
    {
        return response()->json($orderStatus);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:30', 'regex:/^[A-Z0-9_]+$/', Rule::unique('order_status_master', 'code')],
            'label' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'code.regex' => 'Status code may contain only uppercase letters, numbers and underscores.',
        ]);

        $status = OrderStatus::create([
            'code' => strtoupper($data['code']),
            'label' => $data['label'],
            'description' => $data['description'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
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

        // Status Code is read-only after creation (not accepted/changed).
        if (array_key_exists('label', $data)) {
            $orderStatus->label = $data['label'];
        }
        if (array_key_exists('description', $data)) {
            $orderStatus->description = $data['description'];
        }
        if (array_key_exists('sort_order', $data) && $data['sort_order'] !== null) {
            $orderStatus->sort_order = (int) $data['sort_order'];
        }
        if (array_key_exists('is_active', $data)) {
            if ($orderStatus->is_protected && ! (bool) $data['is_active']) {
                throw ValidationException::withMessages([
                    'is_active' => ['Protected workflow statuses cannot be deactivated.'],
                ]);
            }
            $orderStatus->is_active = (bool) $data['is_active'];
        }

        $orderStatus->save();

        return response()->json($orderStatus->fresh());
    }

    /**
     * Activate or deactivate without deleting master records.
     */
    public function setActive(Request $request, OrderStatus $orderStatus): JsonResponse
    {
        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        if ($orderStatus->is_protected && ! (bool) $data['is_active']) {
            throw ValidationException::withMessages([
                'is_active' => ['Protected workflow statuses cannot be deactivated.'],
            ]);
        }

        $orderStatus->is_active = (bool) $data['is_active'];
        $orderStatus->save();

        return response()->json($orderStatus->fresh());
    }

    /**
     * Physical deletion of master records is not permitted (preserves history/IDs).
     */
    public function destroy(OrderStatus $orderStatus): JsonResponse
    {
        throw ValidationException::withMessages([
            'status' => ['Master status records cannot be deleted. Deactivate the status instead.'],
        ]);
    }
}
