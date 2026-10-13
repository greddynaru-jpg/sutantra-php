<?php

namespace Database\Seeders;

use App\Models\HomePageVision;
use Illuminate\Database\Seeder;

class HomePageVisionSeeder extends Seeder
{
    /**
     * Seed / refresh the homepage "About" block (reuses the vision row).
     * Idempotent: updates the first row when one already exists.
     */
    public function run(): void
    {
        $data = [
            'heading' => 'Our Vision',
            'vision_text' => "Our vision is to bring the richness of traditional Indian flavours into every home through delicious sweets, crispy dry snacks, authentic pickles, and flavourful spices.\n\n**Rooted in Tradition. Crafted with Care. Shared with Love.**",
        ];

        $row = HomePageVision::query()->orderBy('id')->first();

        if ($row) {
            $row->update($data);
        } else {
            HomePageVision::query()->create($data);
        }
    }
}