<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HomePagePolicy extends Model
{
    use HasFactory;

    protected $fillable = ['slug', 'title', 'content', 'active', 'display_order'];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }
}