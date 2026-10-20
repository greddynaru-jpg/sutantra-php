<?php

namespace Database\Seeders;

use App\Models\HomePageLogo;
use Illuminate\Database\Seeder;

class HomePageLogoSeeder extends Seeder
{
    /**
     * Seed the initial website logo reference (the existing brand image).
     * Idempotent: creates the singleton row only when none exists, so a logo
     * replaced from the admin is never overwritten.
     */
    public function run(): void
    {
        if (HomePageLogo::query()->exists()) {
            return;
        }

        HomePageLogo::query()->create([
            'image_url' => 'logo/sutantra-foods-logo.jpeg',
        ]);
    }
}
