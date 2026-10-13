<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\MediaController;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Phase 1 (foundation): health, media serving, and Sanctum bearer-token auth.
| Catalog / homepage, cart, orders and payments routes are added in later phases.
|
*/

Route::get('/test', function () {
    return response()->json([
        'success' => true,
        'message' => 'Sutantra Foods Laravel API is working!',
        'application' => 'Sutantra Foods',
        'framework' => 'Laravel 13',
    ]);
});

// Shared media (public image serving from D:\Sutantra\uploads)
Route::get('/media/{path}', [MediaController::class, 'show'])->where('path', '.*');

// Public catalog (homepage + product listing, read-only)
Route::prefix('catalog')->group(function () {
    Route::get('/categories', [CatalogController::class, 'categories']);
    Route::get('/banners', [CatalogController::class, 'banners']);
    Route::get('/vision', [CatalogController::class, 'vision']);
    Route::get('/policies', [CatalogController::class, 'policies']);
    Route::get('/policies/{slug}', [CatalogController::class, 'policy']);
    Route::get('/products', [CatalogController::class, 'products']);
});

// Authentication (password-only; identifier is email OR phone)
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:login');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// Backwards-compatible authenticated user endpoint
Route::get('/user', function (Request $request) {
    return new UserResource($request->user());
})->middleware('auth:sanctum');