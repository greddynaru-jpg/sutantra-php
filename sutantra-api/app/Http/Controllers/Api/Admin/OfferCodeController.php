<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\OfferCodeRequest;
use App\Http\Resources\OfferCodeResource;
use App\Models\OfferCode;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Admin offer-code management (ADMIN + SUPER_ADMIN).
 *
 * Phase 1 is management only: offers can be created, viewed, edited and
 * toggled active/inactive. There is deliberately no delete endpoint, so an
 * offer's history is preserved. Customer-side validation/redemption and
 * checkout integration are a later phase and are not implemented here.
 */
class OfferCodeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = OfferCode::query();

        // The stored codes are upper-cased, so match on the upper-cased term.
        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $query->where('code', 'like', '%'.strtoupper($search).'%');
        }

        $status = $request->query('status');
        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        $offers = $query->orderByDesc('id')->get();

        return OfferCodeResource::collection($offers)->response();
    }

    public function store(OfferCodeRequest $request): JsonResponse
    {
        $data = $this->payload($request);

        if ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active');
        }

        try {
            // The unique index is the real guard against concurrent duplicates;
            // the transaction keeps a failed attempt atomic.
            $offer = DB::transaction(fn () => OfferCode::create($data));
        } catch (QueryException $exception) {
            throw $this->duplicateCode($exception);
        }

        return (new OfferCodeResource($offer))->response()->setStatusCode(201);
    }

    public function show(OfferCode $offer): JsonResponse
    {
        return (new OfferCodeResource($offer))->response();
    }

    public function update(OfferCodeRequest $request, OfferCode $offer): JsonResponse
    {
        $data = $this->payload($request);

        if ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active');
        }

        try {
            DB::transaction(fn () => $offer->update($data));
        } catch (QueryException $exception) {
            throw $this->duplicateCode($exception);
        }

        return (new OfferCodeResource($offer->fresh()))->response();
    }

    public function activate(OfferCode $offer): JsonResponse
    {
        $offer->update(['is_active' => true]);

        return (new OfferCodeResource($offer->fresh()))->response();
    }

    public function deactivate(OfferCode $offer): JsonResponse
    {
        $offer->update(['is_active' => false]);

        return (new OfferCodeResource($offer->fresh()))->response();
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(OfferCodeRequest $request): array
    {
        $type = (string) $request->input('discount_type');

        return [
            'code' => strtoupper(trim((string) $request->input('code'))),
            'description' => $request->filled('description')
                ? trim((string) $request->input('description'))
                : null,
            'discount_type' => $type,
            'discount_value' => $request->input('discount_value'),
            'min_order_amount' => $request->filled('min_order_amount')
                ? $request->input('min_order_amount')
                : 0,
            // A maximum discount only applies to percentage offers.
            'max_discount' => $type === OfferCode::TYPE_PERCENTAGE && $request->filled('max_discount')
                ? $request->input('max_discount')
                : null,
            'starts_at' => $request->filled('starts_at') ? $request->input('starts_at') : null,
            'expires_at' => $request->filled('expires_at') ? $request->input('expires_at') : null,
            'usage_limit' => $request->filled('usage_limit') ? $request->integer('usage_limit') : null,
            'per_customer_limit' => $request->filled('per_customer_limit')
                ? $request->integer('per_customer_limit')
                : null,
        ];
    }

    /**
     * Translate a database unique-constraint violation into a 422 so a
     * concurrent duplicate never surfaces as a 500.
     */
    private function duplicateCode(QueryException $exception): ValidationException
    {
        $sqlState = $exception->errorInfo[0] ?? null;
        $driverCode = $exception->errorInfo[1] ?? null;

        $isDuplicate = $sqlState === '23000'
            || $driverCode === 1062
            || str_contains($exception->getMessage(), 'offer_codes_code_unique')
            || str_contains($exception->getMessage(), 'UNIQUE constraint failed: offer_codes.code');

        if (! $isDuplicate) {
            throw $exception;
        }

        return ValidationException::withMessages([
            'code' => 'This offer code is already in use.',
        ]);
    }
}
