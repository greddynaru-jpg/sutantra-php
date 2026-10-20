<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * A PIN code the business delivers to, together with its delivery charge.
 *
 * Only rows with `active = true` are serviceable. The table is populated by
 * the business; the application never invents coverage or pricing.
 */
class DeliveryPincode extends Model
{
    use HasFactory;

    protected $fillable = ['pincode', 'delivery_charge', 'active'];

    protected function casts(): array
    {
        return [
            'delivery_charge' => 'decimal:2',
            'active' => 'boolean',
        ];
    }
}
