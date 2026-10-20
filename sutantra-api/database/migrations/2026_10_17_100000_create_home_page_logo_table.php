<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Singleton row holding the website logo image reference. Mirrors the
     * existing home_page_vision singleton so the Home Page Administration can
     * persist the logo using the project's database + media conventions.
     */
    public function up(): void
    {
        Schema::create('home_page_logo', function (Blueprint $table) {
            $table->id();
            $table->string('image_url', 500)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_page_logo');
    }
};
