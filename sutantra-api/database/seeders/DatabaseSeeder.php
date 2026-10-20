<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Home page content is refreshed on every run. The initial SUPER_ADMIN is
     * created once by SuperAdminSeeder (idempotent; password rotated later is
     * preserved).
     */
    public function run(): void
    {
        $this->call([
            HomePageVisionSeeder::class,
            HomePagePolicySeeder::class,
            HomePageLogoSeeder::class,
            SuperAdminSeeder::class,
        ]);
    }
}