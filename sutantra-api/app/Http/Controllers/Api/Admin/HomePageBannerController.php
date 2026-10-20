<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\HomePageBannerRequest;
use App\Http\Resources\HomePageBannerResource;
use App\Models\HomePageBanner;
use App\Support\ImageUploadService;
use Illuminate\Http\JsonResponse;

/**
 * Admin homepage-banner management (ADMIN + SUPER_ADMIN).
 */
class HomePageBannerController extends Controller
{
    public function index(): JsonResponse
    {
        $banners = HomePageBanner::query()
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        return HomePageBannerResource::collection($banners)->response();
    }

    public function store(HomePageBannerRequest $request, ImageUploadService $images): JsonResponse
    {
        $data = $this->payload($request);
        $data['image_url'] = $images->store($request->file('image'), 'banners');

        $banner = HomePageBanner::create($data);

        return (new HomePageBannerResource($banner))->response()->setStatusCode(201);
    }

    public function update(HomePageBannerRequest $request, HomePageBanner $banner, ImageUploadService $images): JsonResponse
    {
        $data = $this->payload($request);
        $previous = $banner->image_url;

        if ($request->hasFile('image')) {
            // Store the new image first; the previous file is only removed once
            // the new reference has been saved, so a failed upload never
            // destroys the existing banner artwork.
            $data['image_url'] = $images->store($request->file('image'), 'banners');
        }

        $banner->update($data);

        if (isset($data['image_url']) && $previous !== $data['image_url']) {
            $images->delete($previous);
        }

        return (new HomePageBannerResource($banner->fresh()))->response();
    }

    public function destroy(HomePageBanner $banner, ImageUploadService $images): JsonResponse
    {
        $image = $banner->image_url;
        $banner->delete();
        $images->delete($image);

        return response()->json(['message' => 'Banner deleted successfully.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(HomePageBannerRequest $request): array
    {
        $data = [
            'title' => $request->filled('title') ? trim((string) $request->input('title')) : null,
            'subtitle' => $request->filled('subtitle') ? trim((string) $request->input('subtitle')) : null,
            'target_url' => $request->filled('target_url') ? trim((string) $request->input('target_url')) : null,
        ];

        if ($request->has('active')) {
            $data['active'] = $request->boolean('active');
        }

        if ($request->has('display_order')) {
            $data['display_order'] = $request->integer('display_order');
        }

        return $data;
    }
}
