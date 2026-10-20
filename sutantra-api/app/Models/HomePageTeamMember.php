<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HomePageTeamMember extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'role', 'about', 'message', 'photo_url', 'active', 'display_order'];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }
}
