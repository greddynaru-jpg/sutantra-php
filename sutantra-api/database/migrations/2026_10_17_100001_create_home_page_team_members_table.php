<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Our Team" members shown on the public home page. Created under the
     * Home Page Administration phase because no team structure existed.
     */
    public function up(): void
    {
        Schema::create('home_page_team_members', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('role', 150);
            $table->text('about')->nullable();
            $table->text('message')->nullable();
            $table->string('photo_url', 500)->nullable();
            $table->boolean('active')->default(true);
            $table->integer('display_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_page_team_members');
    }
};
