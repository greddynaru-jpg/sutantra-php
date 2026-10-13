<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Super-admin user management (SUPER_ADMIN only).
 *
 * Guards prevent an administrator from locking themselves out or removing the
 * last remaining super admin. Accounts referenced by carts/orders cannot be
 * hard-deleted; they can be deactivated instead.
 */
class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()->orderBy('id');

        if ($request->filled('role')) {
            $query->where('role', $request->string('role'));
        }

        if ($request->filled('search')) {
            $term = '%'.$request->string('search')->trim().'%';
            $query->where(function ($builder) use ($term) {
                $builder->where('name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('phone', 'like', $term);
            });
        }

        return UserResource::collection($query->get())->response();
    }

    public function store(UserRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->filled('name') ? trim((string) $request->input('name')) : null,
            'email' => strtolower(trim((string) $request->input('email'))),
            'phone' => trim((string) $request->input('phone')),
            'password' => (string) $request->input('password'),
            'role' => (string) $request->input('role'),
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : true,
        ]);

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    public function update(UserRequest $request, User $user): JsonResponse
    {
        $actor = $request->user();
        $newRole = (string) $request->input('role');
        $newActive = $request->has('is_active') ? $request->boolean('is_active') : $user->is_active;

        if ($user->is($actor) && $newRole !== User::ROLE_SUPER_ADMIN) {
            return response()->json([
                'message' => 'You cannot remove your own super admin role.',
            ], 422);
        }

        if ($user->is($actor) && ! $newActive) {
            return response()->json([
                'message' => 'You cannot deactivate your own account.',
            ], 422);
        }

        if ($user->isSuperAdmin()
            && ($newRole !== User::ROLE_SUPER_ADMIN || ! $newActive)
            && User::query()->where('role', User::ROLE_SUPER_ADMIN)->where('is_active', true)->count() <= 1) {
            return response()->json([
                'message' => 'At least one active super administrator must remain.',
            ], 422);
        }

        $user->name = $request->filled('name') ? trim((string) $request->input('name')) : null;
        $user->email = strtolower(trim((string) $request->input('email')));
        $user->phone = trim((string) $request->input('phone'));
        $user->role = $newRole;

        if ($request->filled('password')) {
            $user->password = (string) $request->input('password');
        }

        if ($request->has('is_active')) {
            $user->is_active = $newActive;
        }

        $user->save();

        return (new UserResource($user->fresh()))->response();
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();

        if ($user->is($actor)) {
            return response()->json([
                'message' => 'You cannot delete your own account.',
            ], 422);
        }

        if ($user->isSuperAdmin()
            && User::query()->where('role', User::ROLE_SUPER_ADMIN)->count() <= 1) {
            return response()->json([
                'message' => 'At least one super administrator must remain.',
            ], 422);
        }

        if ($user->carts()->exists() || $user->orders()->exists()) {
            return response()->json([
                'message' => 'This account has existing carts or orders and cannot be deleted. Deactivate it instead.',
            ], 409);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'User deleted successfully.']);
    }
}
