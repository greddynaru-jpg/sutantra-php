<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductCategoryRequest;
use App\Http\Resources\ProductCategoryResource;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Support\ImageUploadService;
use Illuminate\Http\JsonResponse;

/**
 * Admin product-category management (ADMIN + SUPER_ADMIN).
 */
class ProductCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = ProductCategory::query()
            ->withCount('products')
            ->orderBy('name')
            ->get();

        return ProductCategoryResource::collection($categories)->response();
    }

    public function store(ProductCategoryRequest $request, ImageUploadService $images): JsonResponse
    {
        $data = $this->payload($request);

        if ($request->hasFile('image')) {
            $data['image_url'] = $images->store($request->file('image'), 'categories');
        }

        $category = ProductCategory::create($data);

        return (new ProductCategoryResource($category->loadCount('products')))
            ->response()
            ->setStatusCode(201);
    }

    public function update(ProductCategoryRequest $request, ProductCategory $category, ImageUploadService $images): JsonResponse
    {
        $data = $this->payload($request);

        if ($request->hasFile('image')) {
            $images->delete($category->image_url);
            $data['image_url'] = $images->store($request->file('image'), 'categories');
        } elseif ($request->boolean('remove_image')) {
            $images->delete($category->image_url);
            $data['image_url'] = null;
        }

        $category->update($data);

        return (new ProductCategoryResource($category->fresh()->loadCount('products')))->response();
    }

    public function destroy(ProductCategory $category, ImageUploadService $images): JsonResponse
    {
        if (Product::query()->where('category_id', $category->id)->exists()) {
            return response()->json([
                'message' => 'This category still contains products. Move or delete them first.',
            ], 409);
        }

        $image = $category->image_url;
        $category->delete();
        $images->delete($image);

        return response()->json(['message' => 'Category deleted successfully.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(ProductCategoryRequest $request): array
    {
        $data = [
            'name' => trim((string) $request->input('name')),
            'description' => $request->filled('description')
                ? trim((string) $request->input('description'))
                : null,
        ];

        if ($request->has('active')) {
            $data['active'] = $request->boolean('active');
        }

        return $data;
    }
}
