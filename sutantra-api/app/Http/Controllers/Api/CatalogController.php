<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\HomePageBannerResource;
use App\Http\Resources\HomePagePolicyResource;
use App\Http\Resources\HomePageVisionResource;
use App\Http\Resources\ProductCategoryResource;
use App\Http\Resources\ProductResource;
use App\Models\HomePageBanner;
use App\Models\HomePagePolicy;
use App\Models\HomePageVision;
use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public, read-only catalog + homepage endpoints.
 *
 * These power the public homepage (vision / banners / categories / footer
 * policies) and the public product listing. No writes and no auth required.
 */
class CatalogController extends Controller
{
    /**
     * Active product categories, ordered for display.
     */
    public function categories(): JsonResponse
    {
        $categories = ProductCategory::query()
            ->where('active', true)
            ->withCount('products')
            ->orderBy('id')
            ->get();

        return ProductCategoryResource::collection($categories)->response();
    }

    /**
     * Active homepage banners ordered by display order.
     */
    public function banners(): JsonResponse
    {
        $banners = HomePageBanner::query()
            ->where('active', true)
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        return HomePageBannerResource::collection($banners)->response();
    }

    /**
     * Homepage vision ("About") row.
     */
    public function vision(): JsonResponse
    {
        $vision = HomePageVision::query()->first();

        return $vision
            ? (new HomePageVisionResource($vision))->response()
            : response()->json(null);
    }

    /**
     * Published (active) footer policies ordered for display.
     */
    public function policies(): JsonResponse
    {
        $policies = HomePagePolicy::query()
            ->where('active', true)
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        return HomePagePolicyResource::collection($policies)->response();
    }

    /**
     * A single published policy by slug.
     */
    public function policy(string $slug): JsonResponse
    {
        $policy = HomePagePolicy::query()
            ->where('active', true)
            ->where('slug', $slug)
            ->first();

        if ($policy === null) {
            return response()->json(['message' => 'Policy not found.'], 404);
        }

        return (new HomePagePolicyResource($policy))->response();
    }

    /**
     * Public product listing, optionally filtered by category.
     */
    public function products(Request $request): JsonResponse
    {
        $query = Product::query()
            ->with('category')
            ->orderBy('name');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($request->filled('search')) {
            $query->where(function ($builder) use ($request) {
                $term = $request->string('search')->trim();
                $builder->where('name', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%");
            });
        }

        return ProductResource::collection($query->get())->response();
    }
}