<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\HomePagePolicyRequest;
use App\Http\Resources\HomePagePolicyResource;
use App\Models\HomePagePolicy;
use Illuminate\Http\JsonResponse;

/**
 * Admin homepage policy (footer documents) management (ADMIN + SUPER_ADMIN).
 */
class HomePagePolicyController extends Controller
{
    public function index(): JsonResponse
    {
        $policies = HomePagePolicy::query()
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        return HomePagePolicyResource::collection($policies)->response();
    }

    public function store(HomePagePolicyRequest $request): JsonResponse
    {
        $policy = HomePagePolicy::create($this->payload($request));

        return (new HomePagePolicyResource($policy))->response()->setStatusCode(201);
    }

    public function update(HomePagePolicyRequest $request, HomePagePolicy $policy): JsonResponse
    {
        $policy->update($this->payload($request));

        return (new HomePagePolicyResource($policy->fresh()))->response();
    }

    public function destroy(HomePagePolicy $policy): JsonResponse
    {
        $policy->delete();

        return response()->json(['message' => 'Policy deleted successfully.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(HomePagePolicyRequest $request): array
    {
        $data = [
            'slug' => strtolower(trim((string) $request->input('slug'))),
            'title' => trim((string) $request->input('title')),
            'content' => (string) $request->input('content'),
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
