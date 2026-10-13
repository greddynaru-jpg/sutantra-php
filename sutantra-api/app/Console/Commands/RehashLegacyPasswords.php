<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

/**
 * Fixup for environments where the legacy import already copied plaintext
 * password values (the old Java app never hashed them). Re-hashes any value
 * that is not already a recognized hash. Idempotent.
 */
class RehashLegacyPasswords extends Command
{
    protected $signature = 'sutantra:rehash-legacy-passwords';

    protected $description = 'Upgrade legacy plaintext user passwords to bcrypt (idempotent).';

    public function handle(): int
    {
        $count = 0;

        foreach (User::query()->cursor() as $user) {
            $password = (string) $user->getAttributes()['password'];

            if ($password === '' || str_starts_with($password, '$')) {
                continue;
            }

            $user->forceFill(['password' => Hash::make($password)])->save();
            $count++;
            $this->line("Rehashed user id={$user->id} ({$user->email}).");
        }

        $this->info("Rehashed {$count} legacy plaintext password(s) to bcrypt.");

        return self::SUCCESS;
    }
}