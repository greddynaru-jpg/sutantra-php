<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\HomePageLogoRequest;
use App\Http\Resources\HomePageLogoResource;
use App\Models\HomePageLogo;
use App\Support\ImageUploadService;
use Illuminate\Http\JsonResponse;

/**
 * Admin homepage-logo management (SUPER_ADMIN only).
 *
 * The logo is a singleton row. Replacement uploads the new image and persists
 * its reference BEFORE removing the previous file, so a failed upload or save
 * never destroys the existing logo.
 */
class HomePageLogoController extends Controller
{
    public function show(): JsonResponse
    {
        $logo = HomePageLogo::query()->first();

        return $logo
            ? (new HomePageLogoResource($logo))->response()
            : response()->json(null);
    }

    public function update(HomePageLogoRequest $request, ImageUploadService $images): JsonResponse
    {
        $logo = HomePageLogo::query()->first();
        $previous = $logo?->image_url;

        // Store the new file first; only delete the old one once the database
        // reference has been saved successfully.
        $reference = $images->store($request->file('image'), 'logo');

        if ($logo === null) {
            $logo = HomePageLogo::create(['image_url' => $reference]);
        } else {
            $logo->update(['image_url' => $reference]);
        }

        if ($previous !== null && $previous !== '' && $previous !== $reference) {
            $images->delete($previous);
        }

        return (new HomePageLogoResource($logo->fresh()))->response();
    }
}
