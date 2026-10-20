<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * User management (ADMIN + SUPER_ADMIN).
 *
 * A SUPER_ADMIN has full control. An ADMIN may use the module to manage
 * customer (USER) accounts only: they can create customers, and edit or delete
 * existing customers, but they may never change a password, grant a privileged
 * role, or modify/delete an administrator account (§4, §5).
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
        $actor = $request->user();

        // Only a super admin may provision privileged accounts.
        if (! $actor->isSuperAdmin() && (string) $request->input('role') !== User::ROLE_USER) {
            return response()->json([
                'message' => 'Only a super administrator can create administrator accounts.',
            ], 403);
        }

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

        // An ADMIN may only manage customer accounts, may not change any
        // password and may not grant a privileged role (§4, §5).
        if (! $actor->isSuperAdmin()) {
            if ($user->role !== User::ROLE_USER) {
                return response()->json([
                    'message' => 'Only a super administrator can modify administrator accounts.',
                ], 403);
            }

            if ($request->filled('password')) {
                return response()->json([
                    'message' => 'Only a super administrator can change passwords.',
                ], 403);
            }

            if ($newRole !== User::ROLE_USER) {
                return response()->json([
                    'message' => 'Only a super administrator can grant administrator roles.',
                ], 403);
            }
        }

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

        // An ADMIN may only delete customer accounts (§5).
        if (! $actor->isSuperAdmin() && $user->role !== User::ROLE_USER) {
            return response()->json([
                'message' => 'Only a super administrator can delete administrator accounts.',
            ], 403);
        }

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
