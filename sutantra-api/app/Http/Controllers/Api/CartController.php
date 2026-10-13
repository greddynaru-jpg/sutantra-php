<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CartResource;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Authenticated shopping-cart endpoints.
 *
 * The cart always belongs to the authenticated user — a user id is never
 * accepted from the client. Product availability and stock are enforced here
 * (not only in React), and writes run inside transactions with row locks so
 * quantities stay consistent under concurrent requests.
 */
class CartController extends Controller
{
    /**
     * GET /api/cart
     *
     * The caller's active cart. Does not create one (a cart is created on the
     * first add), so simply viewing the page never writes to the database.
     */
    public function show(Request $request): JsonResponse
    {
        $cart = $this->activeCart($request);

        if ($cart === null) {
            $cart = $this->emptyCart($request);
        } else {
            $cart->load('items.product');
        }

        return (new CartResource($cart))->response();
    }

    /**
     * POST /api/cart/items
     *
     * Adds a product; if it is already in the cart, its quantity is increased
     * rather than creating a duplicate line.
     */
    public function addItem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'productId' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ], [
            'productId.required' => 'A product must be provided.',
            'productId.exists' => 'The selected product does not exist.',
            'quantity.required' => 'A quantity must be provided.',
            'quantity.min' => 'Quantity must be at least 1.',
        ]);

        $cart = DB::transaction(function () use ($request, $data) {
            $cart = $this->getOrCreateCart($request);

            // Serialise concurrent adds against the same cart.
            Cart::query()->whereKey($cart->id)->lockForUpdate()->first();

            $product = Product::query()->whereKey($data['productId'])->lockForUpdate()->firstOrFail();
            $this->assertPurchasable($product);

            $quantity = (int) $data['quantity'];
            $stock = (int) $product->stock_quantity;

            $item = CartItem::query()
                ->where('cart_id', $cart->id)
                ->where('product_id', $product->id)
                ->lockForUpdate()
                ->first();

            $existing = $item !== null ? (int) $item->quantity : 0;

            if ($existing + $quantity > $stock) {
                throw ValidationException::withMessages([
                    'quantity' => ["Only {$stock} items are available in stock."],
                ]);
            }

            if ($item === null) {
                CartItem::create([
                    'cart_id' => $cart->id,
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'unit_price' => $product->price,
                ]);
            } else {
                $item->quantity = $existing + $quantity;
                if ($item->unit_price === null) {
                    $item->unit_price = $product->price;
                }
                $item->save();
            }

            return $cart;
        });

        return (new CartResource($cart->fresh(['items.product'])))->response();
    }

    /**
     * PATCH /api/cart/items/{item}/increase
     */
    public function increase(Request $request, CartItem $item): JsonResponse
    {
        $cart = $this->ownedCart($request, $item);

        DB::transaction(function () use ($item) {
            $item = CartItem::query()->whereKey($item->id)->lockForUpdate()->firstOrFail();
            $product = Product::query()->whereKey($item->product_id)->lockForUpdate()->firstOrFail();
            $this->assertPurchasable($product);

            $stock = (int) $product->stock_quantity;

            if ((int) $item->quantity >= $stock) {
                throw ValidationException::withMessages([
                    'quantity' => ["Only {$stock} items are available in stock."],
                ]);
            }

            $item->quantity = (int) $item->quantity + 1;
            $item->save();
        });

        return (new CartResource($cart->fresh(['items.product'])))->response();
    }

    /**
     * PATCH /api/cart/items/{item}/decrease
     *
     * Decreasing the last unit removes the line (matching the legacy design).
     */
    public function decrease(Request $request, CartItem $item): JsonResponse
    {
        $cart = $this->ownedCart($request, $item);

        DB::transaction(function () use ($item) {
            $item = CartItem::query()->whereKey($item->id)->lockForUpdate()->firstOrFail();

            if ((int) $item->quantity <= 1) {
                $item->delete();
            } else {
                $item->quantity = (int) $item->quantity - 1;
                $item->save();
            }
        });

        return (new CartResource($cart->fresh(['items.product'])))->response();
    }

    /**
     * DELETE /api/cart/items/{item}
     */
    public function remove(Request $request, CartItem $item): JsonResponse
    {
        $cart = $this->ownedCart($request, $item);
        $item->delete();

        return (new CartResource($cart->fresh(['items.product'])))->response();
    }

    /**
     * DELETE /api/cart
     */
    public function clear(Request $request): JsonResponse
    {
        $cart = $this->activeCart($request);

        if ($cart === null) {
            return (new CartResource($this->emptyCart($request)))->response();
        }

        CartItem::query()->where('cart_id', $cart->id)->delete();

        return (new CartResource($cart->fresh(['items.product'])))->response();
    }

    private function activeCart(Request $request): ?Cart
    {
        return Cart::query()
            ->where('user_id', $request->user()->id)
            ->where('status', Cart::STATUS_ACTIVE)
            ->first();
    }

    private function getOrCreateCart(Request $request): Cart
    {
        return $this->activeCart($request) ?? Cart::create([
            'user_id' => $request->user()->id,
            'status' => Cart::STATUS_ACTIVE,
        ]);
    }

    private function emptyCart(Request $request): Cart
    {
        $cart = new Cart([
            'user_id' => $request->user()->id,
            'status' => Cart::STATUS_ACTIVE,
        ]);
        $cart->setRelation('items', new Collection());

        return $cart;
    }

    /**
     * The bound item's cart, provided it belongs to the authenticated user and
     * is still active. Others get a 404 so we never reveal another user's data.
     */
    private function ownedCart(Request $request, CartItem $item): Cart
    {
        $cart = $item->cart;

        if ($cart === null
            || (int) $cart->user_id !== (int) $request->user()->id
            || $cart->status !== Cart::STATUS_ACTIVE) {
            abort(404, 'Cart item not found.');
        }

        return $cart;
    }

    private function assertPurchasable(Product $product): void
    {
        if (! $product->available) {
            throw ValidationException::withMessages([
                'productId' => ['This product is not available.'],
            ]);
        }

        if ((int) $product->stock_quantity <= 0) {
            throw ValidationException::withMessages([
                'productId' => ['This product is out of stock.'],
            ]);
        }
    }
}
