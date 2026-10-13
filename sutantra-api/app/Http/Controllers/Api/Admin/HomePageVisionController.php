<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\HomePageVisionRequest;
use App\Http\Resources\HomePageVisionResource;
use App\Models\HomePageVision;
use Illuminate\Http\JsonResponse;

/**
 * Admin homepage vision ("About" section) management (ADMIN + SUPER_ADMIN).
 *
 * The vision is a singleton row; show returns the current value (or null) and
 * update creates the row on first save.
 */
class HomePageVisionController extends Controller
{
    public function show(): JsonResponse
    {
        $vision = HomePageVision::query()->first();

        return $vision
            ? (new HomePageVisionResource($vision))->response()
            : response()->json(null);
    }

    public function update(HomePageVisionRequest $request): JsonResponse
    {
        $data = [
            'heading' => $request->filled('heading') ? trim((string) $request->input('heading')) : null,
            'vision_text' => (string) $request->input('vision_text'),
        ];

        $vision = HomePageVision::query()->first();

        if ($vision === null) {
            $vision = HomePageVision::create($data);
        } else {
            $vision->update($data);
        }

        return (new HomePageVisionResource($vision->fresh()))->response();
    }
}
