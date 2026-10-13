<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\CartItem;
use App\Models\OrderItem;
use App\Models\Product;
use App\Support\ImageUploadService;
use Illuminate\Http\JsonResponse;

/**
 * Admin product management (ADMIN + SUPER_ADMIN).
 *
 * The public catalogue is read-only (see CatalogController); this controller
 * adds authenticated create / update / delete including image uploads.
 */
class ProductController extends Controller
{
    public function index(): JsonResponse
    {
        $products = Product::query()
            ->with('category')
            ->orderBy('name')
            ->get();

        return ProductResource::collection($products)->response();
    }

    public function store(ProductRequest $request, ImageUploadService $images): JsonResponse
    {
        $data = $this->payload($request);

        if ($request->hasFile('image')) {
            $data['image_url'] = $images->store($request->file('image'), 'products');
        }

        $product = Product::create($data);

        return (new ProductResource($product->load('category')))
            ->response()
            ->setStatusCode(201);
    }

    public function update(ProductRequest $request, Product $product, ImageUploadService $images): JsonResponse
    {
        $data = $this->payload($request);

        if ($request->hasFile('image')) {
            $images->delete($product->image_url);
            $data['image_url'] = $images->store($request->file('image'), 'products');
        } elseif ($request->boolean('remove_image')) {
            $images->delete($product->image_url);
            $data['image_url'] = null;
        }

        $product->update($data);

        return (new ProductResource($product->fresh()->load('category')))->response();
    }

    public function destroy(Product $product, ImageUploadService $images): JsonResponse
    {
        if (CartItem::query()->where('product_id', $product->id)->exists()
            || OrderItem::query()->where('product_id', $product->id)->exists()) {
            return response()->json([
                'message' => 'This product appears in existing carts or orders and cannot be deleted. Mark it unavailable instead.',
            ], 409);
        }

        $image = $product->image_url;
        $product->delete();
        $images->delete($image);

        return response()->json(['message' => 'Product deleted successfully.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(ProductRequest $request): array
    {
        $data = [
            'name' => trim((string) $request->input('name')),
            'description' => $request->filled('description')
                ? trim((string) $request->input('description'))
                : null,
            'category_id' => $request->integer('category_id'),
            'price' => $request->input('price'),
            'unit' => $request->filled('unit') ? trim((string) $request->input('unit')) : null,
        ];

        if ($request->has('available')) {
            $data['available'] = $request->boolean('available');
        }

        if ($request->has('stock_quantity')) {
            $data['stock_quantity'] = $request->integer('stock_quantity');
        }

        return $data;
    }
}
