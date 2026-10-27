<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\DeliveryPincode;
use App\Models\OfferCode;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Authenticated checkout: PIN-code serviceability, an authoritative order
 * quote, and secure order creation.
 *
 * The client only ever sends the delivery PIN code and address fields. Prices,
 * totals, serviceability and delivery charges are always derived on the
 * server from the database. No payment is taken in this phase; orders are
 * created unpaid (`payment_status = PENDING`).
 */
class CheckoutController extends Controller
{
    private const UNSERVICEABLE_MESSAGE = 'Delivery is not available for this location.';

    /**
     * POST /api/checkout/quote
     *
     * Validate the PIN code against `delivery_pincodes` and return a
     * server-calculated summary. Optionally validate and apply an offer code.
     * Unserviceable PIN codes deliberately return no delivery charge or total.
     */
    public function quote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pincode' => ['required', 'digits:6'],
            'offer_code' => ['nullable', 'string', 'max:50'],
        ], [
            'pincode.required' => 'Please enter your delivery PIN code.',
            'pincode.digits' => 'Please enter a valid 6-digit PIN code.',
        ]);

        $cart = $this->activeCart($request);

        if ($cart === null || $cart->items()->count() === 0) {
            throw ValidationException::withMessages([
                'cart' => ['Your cart is empty.'],
            ]);
        }

        $pincode = $this->serviceablePincode($data['pincode']);

        if ($pincode === null) {
            return response()->json([
                'serviceable' => false,
                'pincode' => $data['pincode'],
                'message' => self::UNSERVICEABLE_MESSAGE,
            ]);
        }

        $cart->load('items.product');
        $pricing = $this->priceItems($cart->items);
        $delivery = round((float) $pincode->delivery_charge, 2);

        $discountAmount = 0.0;
        $appliedOffer = null;
        $offerError = null;

        if (!empty($data['offer_code'])) {
            [$appliedOffer, $discountAmount, $offerError] = $this->evaluateOffer(
                $data['offer_code'],
                $pricing['subtotal'],
                $request->user()->id
            );
        }

        if ($offerError !== null) {
            return response()->json([
                'serviceable' => true,
                'pincode' => $pincode->pincode,
                'items' => $pricing['items'],
                'subtotal' => $pricing['subtotal'],
                'discountAmount' => 0.0,
                'deliveryCharge' => $delivery,
                'taxAmount' => 0.0,
                'totalAmount' => round($pricing['subtotal'] + $delivery, 2),
                'currency' => 'INR',
                'offer' => null,
                'offerError' => $offerError,
            ]);
        }

        $totalAmount = round($pricing['subtotal'] - $discountAmount + $delivery, 2);
        if ($totalAmount < 0) {
            $totalAmount = 0.0;
        }

        return response()->json([
            'serviceable' => true,
            'pincode' => $pincode->pincode,
            'items' => $pricing['items'],
            'subtotal' => $pricing['subtotal'],
            'discountAmount' => round($discountAmount, 2),
            'deliveryCharge' => $delivery,
            'taxAmount' => 0.0,
            'totalAmount' => $totalAmount,
            'currency' => 'INR',
            'offer' => $appliedOffer,
            'offerError' => null,
        ]);
    }

    /**
     * POST /api/orders
     *
     * Revalidate everything and create the order inside one transaction. The
     * cart row is locked and its items are cleared in the same transaction,
     * so simultaneous or repeated submissions cannot create a second order.
     * Offers are revalidated server-side at submission time.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'max:20', 'regex:/^[0-9+\-\s]{7,20}$/'],
            'address' => ['required', 'string', 'max:500'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['required', 'string', 'max:100'],
            'pincode' => ['required', 'digits:6'],
            'offer_code' => ['nullable', 'string', 'max:50'],
        ], [
            'pincode.required' => 'Please enter your delivery PIN code.',
            'pincode.digits' => 'Please enter a valid 6-digit PIN code.',
        ]);

        $order = DB::transaction(function () use ($request, $data) {
            $cart = Cart::query()
                ->where('user_id', $request->user()->id)
                ->where('status', Cart::STATUS_ACTIVE)
                ->lockForUpdate()
                ->first();

            if ($cart === null) {
                throw ValidationException::withMessages(['cart' => ['Your cart is empty.']]);
            }

            $cartItems = CartItem::query()
                ->where('cart_id', $cart->id)
                ->lockForUpdate()
                ->get();

            if ($cartItems->isEmpty()) {
                throw ValidationException::withMessages(['cart' => ['Your cart is empty.']]);
            }

            // Lock products so price/availability/stock cannot change between
            // validation and order creation.
            $products = Product::query()
                ->whereIn('id', $cartItems->pluck('product_id')->all())
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $cartItems->each(function (CartItem $item) use ($products) {
                $item->setRelation('product', $products->get($item->product_id));
            });

            $pincode = $this->serviceablePincode($data['pincode']);

            if ($pincode === null) {
                throw ValidationException::withMessages([
                    'pincode' => [self::UNSERVICEABLE_MESSAGE],
                ]);
            }

            $pricing = $this->priceItems($cartItems);
            $delivery = round((float) $pincode->delivery_charge, 2);

            $discountAmount = 0.0;
            if (!empty($data['offer_code'])) {
                $code = strtoupper(trim($data['offer_code']));
                $offer = OfferCode::query()
                    ->where('code', $code)
                    ->lockForUpdate()
                    ->first();

                if ($code === 'WELCOME10') {
                    $redeemed = Order::query()
                        ->where('user_id', $request->user()->id)
                        ->where(function ($q): void {
                            $q->where('payment_status', Order::PAYMENT_PAID)
                                ->orWhereIn('status', [Order::STATUS_CONFIRMED, Order::STATUS_SHIPPED, Order::STATUS_DELIVERED]);
                        })
                        ->where('discount_amount', '>', 0)
                        ->exists();

                    if ($redeemed) {
                        throw ValidationException::withMessages([
                            'offer_code' => ['This offer code is not valid for your account.'],
                        ]);
                    }
                }

                [$appliedOffer, $discountAmount, $offerError] = $this->evaluateOffer(
                    $data['offer_code'],
                    $pricing['subtotal'],
                    $request->user()->id,
                    true
                );

                if ($offerError !== null || $appliedOffer === null) {
                    throw ValidationException::withMessages([
                        'offer_code' => [$offerError ?? 'This offer code could not be applied.'],
                    ]);
                }

                if ($offer !== null && $offer->usage_limit !== null && (int) $offer->used_count >= (int) $offer->usage_limit) {
                    throw ValidationException::withMessages([
                        'offer_code' => ['This offer code has already been used up.'],
                    ]);
                }

                $discountAmount = round((float) $discountAmount, 2);
                if ($offer !== null && $offer->usage_limit !== null) {
                    $offer->increment('used_count');
                }
            }

            $totalAmount = round($pricing['subtotal'] - $discountAmount + $delivery, 2);
            if ($totalAmount < 0) {
                $totalAmount = 0.0;
            }

            $order = Order::create([
                'order_number' => $this->newOrderNumber(),
                'user_id' => $request->user()->id,
                'status' => Order::STATUS_CREATED,
                'payment_status' => Order::PAYMENT_PENDING,
                'subtotal' => $pricing['subtotal'],
                'discount_amount' => $discountAmount,
                'delivery_charge' => $delivery,
                'tax_amount' => 0,
                'total_amount' => $totalAmount,
                'currency' => 'INR',
                'customer_name' => $data['name'],
                'customer_phone' => $data['phone'],
                'customer_email' => $request->user()->email,
                'delivery_address' => $this->addressSnapshot($data),
            ]);

            foreach ($pricing['lines'] as $line) {
                $order->items()->create($line);
            }

            // The order is now the source of truth; clearing the cart in the
            // same transaction blocks duplicate submissions.
            CartItem::query()->where('cart_id', $cart->id)->delete();

            return $order->load('items');
        });

        return (new OrderResource($order))->response()->setStatusCode(201);
    }

    private function activeCart(Request $request): ?Cart
    {
        return Cart::query()
            ->where('user_id', $request->user()->id)
            ->where('status', Cart::STATUS_ACTIVE)
            ->first();
    }

    private function serviceablePincode(string $pincode): ?DeliveryPincode
    {
        return DeliveryPincode::query()
            ->where('pincode', $pincode)
            ->where('active', true)
            ->first();
    }

    /**
     * Price the cart from the products table (never from client input or the
     * possibly stale cart unit_price) and enforce availability/stock.
     *
     * @param  \Illuminate\Support\Collection<int, CartItem>  $cartItems
     * @return array{items: list<array<string, mixed>>, lines: list<array<string, mixed>>, subtotal: float}
     */
    private function priceItems($cartItems): array
    {
        $items = [];
        $lines = [];
        $subtotal = 0.0;

        foreach ($cartItems as $item) {
            $product = $item->product;

            if ($product === null) {
                throw ValidationException::withMessages([
                    'cart' => ['A product in your cart is no longer available.'],
                ]);
            }

            $quantity = (int) $item->quantity;

            if ($quantity < 1) {
                throw ValidationException::withMessages([
                    'cart' => ['Your cart contains an invalid quantity.'],
                ]);
            }

            if (! $product->available) {
                throw ValidationException::withMessages([
                    'cart' => ["{$product->name} is not available."],
                ]);
            }

            if ((int) $product->stock_quantity < $quantity) {
                throw ValidationException::withMessages([
                    'cart' => ["Only {$product->stock_quantity} of {$product->name} are available in stock."],
                ]);
            }

            $unitPrice = round((float) $product->price, 2);
            $lineTotal = round($unitPrice * $quantity, 2);
            $subtotal = round($subtotal + $lineTotal, 2);

            $items[] = [
                'productId' => $product->id,
                'name' => $product->name,
                'quantity' => $quantity,
                'unit' => $product->unit,
                'unitPrice' => $unitPrice,
                'lineTotal' => $lineTotal,
                'imageUrl' => $product->image_url,
            ];

            $lines[] = [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'total_price' => $lineTotal,
                'unit' => $product->unit,
            ];
        }

        return ['items' => $items, 'lines' => $lines, 'subtotal' => $subtotal];
    }

    private function newOrderNumber(): string
    {
        do {
            $number = 'SF'.now()->format('ymd').strtoupper(Str::random(6));
        } while (Order::query()->where('order_number', $number)->exists());

        return $number;
    }

    /**
     * @param  array{name: string, address: string, city: string, state: string, pincode: string, phone: string}  $data
     */
    private function addressSnapshot(array $data): string
    {
        return implode("\n", [
            $data['name'],
            $data['address'],
            $data['city'].', '.$data['state'].' - '.$data['pincode'],
            'Phone: '.$data['phone'],
        ]);
    }

    /**
     * @return array{0: array<string,mixed>|null, 1: float, 2: string|null}
     */
    private function evaluateOffer(string $offerCode, float $subtotal, int $userId, bool $forOrder = false): array
    {
        $code = strtoupper(trim($offerCode));

        if ($code === '') {
            return [null, 0.0, 'Please enter a valid offer code.'];
        }

        $offer = OfferCode::query()
            ->where('code', $code)
            ->first();

        if ($offer === null) {
            return [null, 0.0, 'This offer code is not valid.'];
        }

        if (! (bool) $offer->is_active) {
            return [null, 0.0, 'This offer code is no longer active.'];
        }

        $today = now()->startOfDay();
        if ($offer->starts_at !== null && $today->lt($offer->starts_at)) {
            return [null, 0.0, 'This offer code is not yet valid.'];
        }
        if ($offer->expires_at !== null && $today->gt($offer->expires_at)) {
            return [null, 0.0, 'This offer code has expired.'];
        }

        if ($offer->usage_limit !== null && (int) $offer->used_count >= (int) $offer->usage_limit) {
            return [null, 0.0, 'This offer code has already been used up.'];
        }

        if ($code === 'WELCOME10') {
            $redeemed = Order::query()
                ->where('user_id', $userId)
                ->where(function ($q): void {
                    $q->where('payment_status', Order::PAYMENT_PAID)
                        ->orWhereIn('status', [Order::STATUS_CONFIRMED, Order::STATUS_SHIPPED, Order::STATUS_DELIVERED]);
                })
                ->where('discount_amount', '>', 0)
                ->exists();

            if ($redeemed) {
                return [null, 0.0, 'This offer code is not valid for your account.'];
            }
        }

        $minOrder = round((float) $offer->min_order_amount, 2);
        if ($minOrder > 0 && $subtotal < $minOrder) {
            return [null, 0.0, 'This offer code requires a minimum order of '.number_format($minOrder, 2).'.'];
        }

        $discount = 0.0;
        if ($offer->discount_type === OfferCode::TYPE_PERCENTAGE) {
            $discount = round($subtotal * ((float) $offer->discount_value / 100), 2);
            if ($offer->max_discount !== null) {
                $max = round((float) $offer->max_discount, 2);
                if ($discount > $max) {
                    $discount = $max;
                }
            }
        } elseif ($offer->discount_type === OfferCode::TYPE_FIXED) {
            $discount = round((float) $offer->discount_value, 2);
        } else {
            return [null, 0.0, 'This offer code is not valid.'];
        }

        if ($discount < 0) {
            $discount = 0.0;
        }
        if ($discount > $subtotal) {
            $discount = $subtotal;
        }

        $applied = [
            'code' => $offer->code,
            'description' => $offer->description,
            'discountType' => $offer->discount_type,
            'discountValue' => (float) $offer->discount_value,
            'minOrderAmount' => (float) $offer->min_order_amount,
            'maxDiscount' => $offer->max_discount !== null ? (float) $offer->max_discount : null,
        ];

        return [$applied, $discount, null];
    }
}
