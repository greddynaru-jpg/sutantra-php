<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\HomePageTeamMemberRequest;
use App\Http\Resources\HomePageTeamMemberResource;
use App\Models\HomePageTeamMember;
use App\Support\ImageUploadService;
use Illuminate\Http\JsonResponse;

/**
 * Admin "Our Team" management (SUPER_ADMIN only).
 *
 * Photos are optional and stored under uploads/team. A replacement stores the
 * new photo and saves its reference before the previous file is removed; the
 * previous file is never deleted while another member still references it.
 */
class HomePageTeamMemberController extends Controller
{
    public function index(): JsonResponse
    {
        $members = HomePageTeamMember::query()
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        return HomePageTeamMemberResource::collection($members)->response();
    }

    public function store(HomePageTeamMemberRequest $request, ImageUploadService $images): JsonResponse
    {
        $data = $this->payload($request);

        if ($request->hasFile('photo')) {
            $data['photo_url'] = $images->store($request->file('photo'), 'team');
        }

        $member = HomePageTeamMember::create($data);

        return (new HomePageTeamMemberResource($member))->response()->setStatusCode(201);
    }

    public function update(
        HomePageTeamMemberRequest $request,
        HomePageTeamMember $teamMember,
        ImageUploadService $images
    ): JsonResponse {
        $data = $this->payload($request);
        $previous = $teamMember->photo_url;

        if ($request->hasFile('photo')) {
            // Store first, save the reference, then remove the old file.
            $data['photo_url'] = $images->store($request->file('photo'), 'team');
        } elseif ($request->boolean('remove_photo')) {
            $data['photo_url'] = null;
        }

        $teamMember->update($data);

        $new = $data['photo_url'] ?? null;

        if ($previous !== null && $previous !== '' && $previous !== $new) {
            $this->deleteIfUnreferenced($previous, $teamMember->id, $images);
        }

        return (new HomePageTeamMemberResource($teamMember->fresh()))->response();
    }

    public function destroy(HomePageTeamMember $teamMember, ImageUploadService $images): JsonResponse
    {
        $photo = $teamMember->photo_url;
        $id = $teamMember->id;

        $teamMember->delete();

        if ($photo !== null && $photo !== '') {
            $this->deleteIfUnreferenced($photo, $id, $images);
        }

        return response()->json(['message' => 'Team member deleted successfully.']);
    }

    /**
     * Remove a stored photo unless another member still references it.
     */
    private function deleteIfUnreferenced(string $photo, int $ignoreId, ImageUploadService $images): void
    {
        $stillUsed = HomePageTeamMember::query()
            ->where('photo_url', $photo)
            ->whereKeyNot($ignoreId)
            ->exists();

        if (! $stillUsed) {
            $images->delete($photo);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(HomePageTeamMemberRequest $request): array
    {
        $data = [
            'name' => trim((string) $request->input('name')),
            'role' => trim((string) $request->input('role')),
            'about' => $request->filled('about') ? trim((string) $request->input('about')) : null,
            'message' => $request->filled('message') ? trim((string) $request->input('message')) : null,
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
