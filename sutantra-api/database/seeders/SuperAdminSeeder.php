<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Provisions the initial SUPER_ADMIN account.
 *
 * - Password-only login with email OR phone (both are stored here).
 * - Only the bcrypt hash is persisted (never the plaintext password).
 * - If no SUPER_ADMIN exists yet, it promotes the account matching the
 *   configured email/phone (creating it if absent).
 * - Idempotent: once a SUPER_ADMIN exists nothing is modified, so a password
 *   rotated after the first run is preserved.
 * - The initial password is intentionally weak and must be rotated before
 *   production. No public SUPER_ADMIN registration route exists.
 */
class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $config = config('sutantra.super_admin');

        if (User::query()->where('role', User::ROLE_SUPER_ADMIN)->exists()) {
            $this->command?->warn('A SUPER_ADMIN already exists; left unchanged.');

            return;
        }

        $user = User::query()
            ->where('email', $config['email'])
            ->orWhere('phone', $config['phone'])
            ->first();

        if ($user !== null) {
            $user->forceFill([
                'role' => User::ROLE_SUPER_ADMIN,
                'is_active' => true,
                // Store the hash only; the model's "hashed" cast leaves it as-is.
                'password' => Hash::make($config['password']),
            ])->save();

            $this->command?->info(
                'Promoted existing user #'.$user->id.' to SUPER_ADMIN. Rotate the initial password before production.'
            );

            return;
        }

        $user = User::query()->create([
            'name' => $config['name'],
            'email' => $config['email'],
            'phone' => $config['phone'],
            'password' => Hash::make($config['password']),
            'role' => User::ROLE_SUPER_ADMIN,
            'is_active' => true,
        ]);

        $this->command?->info(
            'SUPER_ADMIN created (user #'.$user->id.'). Rotate the initial password before production.'
        );
    }
}
