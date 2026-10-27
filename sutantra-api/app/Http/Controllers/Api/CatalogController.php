<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\HomePageBannerResource;
use App\Http\Resources\HomePageLogoResource;
use App\Http\Resources\HomePagePolicyResource;
use App\Http\Resources\HomePageTeamMemberResource;
use App\Http\Resources\HomePageVisionResource;
use App\Http\Resources\ProductCategoryResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\PublicOfferCodeResource;
use App\Models\HomePageBanner;
use App\Models\HomePageLogo;
use App\Models\HomePagePolicy;
use App\Models\HomePageTeamMember;
use App\Models\HomePageVision;
use App\Models\OfferCode;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Public, read-only catalog + homepage endpoints.
 *
 * These power the public homepage (vision / banners / categories / footer
 * policies) and the public product listing. No writes and no auth required.
 */
class CatalogController extends Controller
{
    /**
     * Active top-level product categories (each with its active subcategories
     * nested under `children`), ordered for display.
     */
    public function categories(): JsonResponse
    {
        $categories = ProductCategory::query()
            ->where('active', true)
            ->whereNull('parent_id')
            ->with(['children' => function ($query): void {
                $query->where('active', true)
                    ->withCount('products')
                    ->orderBy('id');
            }])
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
     * Website logo row (single record), used by the public site header.
     */
    public function logo(): JsonResponse
    {
        $logo = HomePageLogo::query()->first();

        return $logo
            ? (new HomePageLogoResource($logo))->response()
            : response()->json(null);
    }

    /**
     * Enabled team members ordered for display on the public home page.
     */
    public function team(): JsonResponse
    {
        $members = HomePageTeamMember::query()
            ->where('active', true)
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        return HomePageTeamMemberResource::collection($members)->response();
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
     * Offer codes for the public/customer checkout.
     *
     * Eligibility follows the stored rules: the offer must be active, not
     * past its expiry date, and not exhausted by its usage limit. An active
     * offer with a future start date is included so the homepage can announce
     * it before it becomes redeemable. Only customer-facing fields are
     * returned (see PublicOfferCodeResource).
     *
     * Welcome offer (WELCOME10) is hidden for customers who have already
     * successfully redeemed it (completed/paid orders with this offer applied).
     */
    public function offers(Request $request): JsonResponse
    {
        $today = now()->toDateString();
        $user = Auth::guard('sanctum')->user() ?? $request->user();

        $offers = OfferCode::query()
            ->where('is_active', true)
            ->where(function ($query) use ($today): void {
                $query->whereNull('expires_at')->orWhereDate('expires_at', '>=', $today);
            })
            ->where(function ($query): void {
                $query->whereNull('usage_limit')->orWhereColumn('used_count', '<', 'usage_limit');
            })
            ->orderByDesc('id')
            ->get();

        if ($user !== null) {
            $offers = $offers->filter(function (OfferCode $offer) use ($user): bool {
                if (strtoupper($offer->code) === 'WELCOME10') {
                    $redeemed = Order::query()
                        ->where('user_id', $user->id)
                        ->where(function ($q): void {
                            $q->where('payment_status', Order::PAYMENT_PAID)
                                ->orWhereIn('status', [Order::STATUS_CONFIRMED, Order::STATUS_SHIPPED, Order::STATUS_DELIVERED]);
                        })
                        ->where('discount_amount', '>', 0)
                        ->exists();

                    if ($redeemed) {
                        return false;
                    }
                }

                return true;
            })->values();
        }

        return PublicOfferCodeResource::collection($offers)->response();
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
            $categoryId = $request->integer('category_id');

            // A parent-category selection must include products assigned
            // directly to it AND products assigned to its subcategories. A
            // subcategory selection simply matches its own products (it has no
            // children). The OR uses where/orWhereHas (not a join) so products
            // are never duplicated.
            $query->where(function ($builder) use ($categoryId): void {
                $builder->where('category_id', $categoryId)
                    ->orWhereHas('category', function ($sub) use ($categoryId): void {
                        $sub->where('parent_id', $categoryId);
                    });
            });
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