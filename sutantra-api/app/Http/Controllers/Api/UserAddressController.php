<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UserAddressController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $addresses = $request->user()
            ->addresses()
            ->get();

        return response()->json(['data' => $addresses]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'max:20', 'regex:/^[0-9+\-\s]{7,20}$/'],
            'address' => ['required', 'string', 'max:500'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['required', 'string', 'max:100'],
            'pincode' => ['required', 'digits:6'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        $address = DB::transaction(function () use ($user, $data) {
            $count = $user->addresses()->lockForUpdate()->count();
            if ($count >= 3) {
                throw ValidationException::withMessages([
                    'address' => ['You can save a maximum of 3 addresses. Please edit or delete an existing address to add another.'],
                ]);
            }

            $makeDefault = ! empty($data['is_default']) || $count === 0;

            if ($makeDefault) {
                $user->addresses()->update(['is_default' => false]);
            }

            return $user->addresses()->create([
                'name' => $data['name'],
                'phone' => $data['phone'],
                'address' => $data['address'],
                'city' => $data['city'],
                'state' => $data['state'],
                'pincode' => $data['pincode'],
                'is_default' => $makeDefault,
            ]);
        });

        return response()->json(['data' => $address], 201);
    }

    public function update(Request $request, UserAddress $userAddress): JsonResponse
    {
        $this->authorizeAddress($request, $userAddress);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'max:20', 'regex:/^[0-9+\-\s]{7,20}$/'],
            'address' => ['required', 'string', 'max:500'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['required', 'string', 'max:100'],
            'pincode' => ['required', 'digits:6'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();

        $address = DB::transaction(function () use ($user, $userAddress, $data) {
            if (! empty($data['is_default'])) {
                $user->addresses()->update(['is_default' => false]);
            }

            $userAddress->update([
                'name' => $data['name'],
                'phone' => $data['phone'],
                'address' => $data['address'],
                'city' => $data['city'],
                'state' => $data['state'],
                'pincode' => $data['pincode'],
                'is_default' => ! empty($data['is_default']) ? true : $userAddress->is_default,
            ]);

            return $userAddress->fresh();
        });

        return response()->json(['data' => $address]);
    }

    public function destroy(Request $request, UserAddress $userAddress): JsonResponse
    {
        $this->authorizeAddress($request, $userAddress);

        $userAddress->delete();

        return response()->json(['message' => 'Address deleted.']);
    }

    private function authorizeAddress(Request $request, UserAddress $userAddress): void
    {
        if ((int) $userAddress->user_id !== (int) $request->user()->id) {
            abort(403, 'This address does not belong to you.');
        }
    }
}
