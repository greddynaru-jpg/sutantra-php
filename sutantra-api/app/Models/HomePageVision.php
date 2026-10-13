<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HomePageVision extends Model
{
    use HasFactory;

    protected $table = 'home_page_vision';

    protected $fillable = ['heading', 'vision_text'];
}