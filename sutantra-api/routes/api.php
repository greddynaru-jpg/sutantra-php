<?php

use App\Http\Controllers\Api\Admin\HomePageBannerController;
use App\Http\Controllers\Api\Admin\HomePageLogoController;
use App\Http\Controllers\Api\Admin\HomePagePolicyController;
use App\Http\Controllers\Api\Admin\HomePageTeamMemberController;
use App\Http\Controllers\Api\Admin\HomePageVisionController;
use App\Http\Controllers\Api\Admin\OfferCodeController;
use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\OrderStatusController as AdminOrderStatusController;
use App\Http\Controllers\Api\Admin\ProductCategoryController;
use App\Http\Controllers\Api\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\OrderController;
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
    Route::get('/logo', [CatalogController::class, 'logo']);
    Route::get('/team', [CatalogController::class, 'team']);
    Route::get('/policies', [CatalogController::class, 'policies']);
    Route::get('/policies/{slug}', [CatalogController::class, 'policy']);
    Route::get('/offers', [CatalogController::class, 'offers']);
    Route::get('/products', [CatalogController::class, 'products']);
});

// Authentication (password-only; identifier is email OR phone)
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:login');

    // Step 1 of the two-step login UI ("Get Verification Code"). Validates the
    // identifier only; no code is generated or sent yet.
    Route::post('/request-code', [AuthController::class, 'requestVerificationCode'])->middleware('throttle:login');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// ── Authenticated cart (the cart always belongs to the token's user) ──
Route::middleware('auth:sanctum')->prefix('cart')->group(function () {
    Route::get('/', [CartController::class, 'show']);
    Route::post('/items', [CartController::class, 'addItem']);
    Route::patch('/items/{item}/increase', [CartController::class, 'increase']);
    Route::patch('/items/{item}/decrease', [CartController::class, 'decrease']);
    Route::delete('/items/{item}', [CartController::class, 'remove']);
    Route::delete('/', [CartController::class, 'clear']);
});

// ── Authenticated checkout & order creation ──────────────────────────
// The client sends only address fields + the PIN code; every amount is
// recalculated on the server from the database.
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/checkout/quote', [CheckoutController::class, 'quote']);
    Route::post('/orders', [CheckoutController::class, 'store']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::get('/addresses', [App\Http\Controllers\Api\UserAddressController::class, 'index']);
    Route::post('/addresses', [App\Http\Controllers\Api\UserAddressController::class, 'store']);
    Route::put('/addresses/{userAddress}', [App\Http\Controllers\Api\UserAddressController::class, 'update']);
    Route::delete('/addresses/{userAddress}', [App\Http\Controllers\Api\UserAddressController::class, 'destroy']);
});

// ── Admin: catalogue management (authenticated, ADMIN + SUPER_ADMIN) ──
Route::middleware('auth:sanctum')->prefix('admin')->group(function () {
    Route::middleware('role:ADMIN,SUPER_ADMIN')->group(function () {
        Route::get('/products', [AdminProductController::class, 'index']);
        Route::post('/products', [AdminProductController::class, 'store']);
        // POST is accepted alongside PUT/PATCH so multipart image uploads work
        // (PHP does not parse multipart bodies for real PUT requests).
        Route::match(['put', 'patch', 'post'], '/products/{product}', [AdminProductController::class, 'update']);
        Route::delete('/products/{product}', [AdminProductController::class, 'destroy']);

        Route::get('/categories', [ProductCategoryController::class, 'index']);
        Route::post('/categories', [ProductCategoryController::class, 'store']);
        Route::match(['put', 'patch', 'post'], '/categories/{category}', [ProductCategoryController::class, 'update']);
        Route::delete('/categories/{category}', [ProductCategoryController::class, 'destroy']);

        // Offer codes (Phase 1: admin management only; no delete by design).
        Route::get('/offers', [OfferCodeController::class, 'index']);
        Route::post('/offers', [OfferCodeController::class, 'store']);
        Route::get('/offers/{offer}', [OfferCodeController::class, 'show']);
        Route::match(['put', 'patch', 'post'], '/offers/{offer}', [OfferCodeController::class, 'update']);
        Route::patch('/offers/{offer}/activate', [OfferCodeController::class, 'activate']);
        Route::patch('/offers/{offer}/deactivate', [OfferCodeController::class, 'deactivate']);

        // User management is reachable by both administrators, but the
        // controller enforces the finer rules: an ADMIN may only manage
        // customer (USER) accounts and may never change passwords or grant
        // privileged roles (§4, §5).
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::match(['put', 'patch', 'post'], '/users/{user}', [AdminUserController::class, 'update']);
        Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);
    });

    // Super Admin dashboard: home page content. Banners, vision and policies
    // used to be ADMIN + SUPER_ADMIN, but they are now Super-Admin-only modules
    // managed through Home Page Administration.
    Route::middleware('role:SUPER_ADMIN')->group(function () {
        Route::get('/banners', [HomePageBannerController::class, 'index']);
        Route::post('/banners', [HomePageBannerController::class, 'store']);
        Route::match(['put', 'patch', 'post'], '/banners/{banner}', [HomePageBannerController::class, 'update']);
        Route::delete('/banners/{banner}', [HomePageBannerController::class, 'destroy']);

        Route::get('/policies', [HomePagePolicyController::class, 'index']);
        Route::post('/policies', [HomePagePolicyController::class, 'store']);
        Route::match(['put', 'patch', 'post'], '/policies/{policy}', [HomePagePolicyController::class, 'update']);
        Route::delete('/policies/{policy}', [HomePagePolicyController::class, 'destroy']);

        Route::get('/vision', [HomePageVisionController::class, 'show']);
        Route::match(['put', 'patch', 'post'], '/vision', [HomePageVisionController::class, 'update']);

        // Home Page Administration: logo + "Our Team".
        Route::get('/home-page/logo', [HomePageLogoController::class, 'show']);
        Route::match(['put', 'patch', 'post'], '/home-page/logo', [HomePageLogoController::class, 'update']);

        Route::get('/home-page/team', [HomePageTeamMemberController::class, 'index']);
        Route::post('/home-page/team', [HomePageTeamMemberController::class, 'store']);
        Route::match(['put', 'patch', 'post'], '/home-page/team/{teamMember}', [HomePageTeamMemberController::class, 'update']);
        Route::delete('/home-page/team/{teamMember}', [HomePageTeamMemberController::class, 'destroy']);
    });
});

// Backwards-compatible authenticated user endpoint
Route::get('/user', function (Request $request) {
    return new UserResource($request->user());
})->middleware('auth:sanctum');