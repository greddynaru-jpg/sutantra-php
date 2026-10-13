<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/test', function () {
    return response()->json([
        'success' => true,
        'message' => 'Sutantra Foods Laravel API is working!',
        'application' => 'Sutantra Foods',
        'framework' => 'Laravel 13'
    ]);
});