<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HomePageBanner extends Model
{
    use HasFactory;

    protected $fillable = ['title', 'subtitle', 'image_url', 'target_url', 'active', 'display_order'];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }
}