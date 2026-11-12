<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PaymentStatusController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PaymentStatus::query();

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('status_code', 'like', "%{$search}%")
                    ->orWhere('display_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('active')) {
            $active = filter_var($request->input('active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($active !== null) {
                $query->where('is_active', $active);
            }
        }

        $query->orderBy('sort_order')->orderBy('id');

        if ($request->filled('per_page')) {
            $perPage = max(1, min(100, (int) $request->input('per_page', 15)));
            return response()->json($query->paginate($perPage)->withQueryString());
        }

        return response()->json($query->get());
    }

    public function show(PaymentStatus $paymentStatus): JsonResponse
    {
        return response()->json($paymentStatus);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status_code' => ['required', 'string', 'max:50', 'regex:/^[A-Z0-9_]+$/', Rule::unique('payment_status_master', 'status_code')],
            'display_name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'status_code.regex' => 'Status code may contain only uppercase letters, numbers and underscores.',
        ]);

        $status = PaymentStatus::create([
            'status_code' => strtoupper($data['status_code']),
            'display_name' => $data['display_name'],
            'description' => $data['description'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
        ]);

        return response()->json($status, 201);
    }

    public function update(Request $request, PaymentStatus $paymentStatus): JsonResponse
    {
        $data = $request->validate([
            'display_name' => ['sometimes', 'required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        // status_code is read-only after creation.
        if (array_key_exists('display_name', $data)) {
            $paymentStatus->display_name = $data['display_name'];
        }
        if (array_key_exists('description', $data)) {
            $paymentStatus->description = $data['description'];
        }
        if (array_key_exists('sort_order', $data) && $data['sort_order'] !== null) {
            $paymentStatus->sort_order = (int) $data['sort_order'];
        }
        if (array_key_exists('is_active', $data)) {
            $paymentStatus->is_active = (bool) $data['is_active'];
        }

        $paymentStatus->save();

        return response()->json($paymentStatus->fresh());
    }

    public function setActive(Request $request, PaymentStatus $paymentStatus): JsonResponse
    {
        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $paymentStatus->is_active = (bool) $data['is_active'];
        $paymentStatus->save();

        return response()->json($paymentStatus->fresh());
    }
}