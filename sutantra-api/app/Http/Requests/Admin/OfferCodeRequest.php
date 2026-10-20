<?php

namespace App\Http\Requests\Admin;

use App\Models\OfferCode;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OfferCodeRequest extends FormRequest
{
    /**
     * Authorization is handled by the route middleware (auth:sanctum + role).
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normalise the code before validation so uniqueness is case-insensitive
     * and the stored value is always upper-cased.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('code')) {
            $this->merge(['code' => strtoupper(trim((string) $this->input('code')))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $offer = $this->route('offer');
        $isPercentage = $this->input('discount_type') === OfferCode::TYPE_PERCENTAGE;

        return [
            'code' => [
                'required',
                'string',
                'max:50',
                'regex:/^[A-Z0-9][A-Z0-9_-]*$/',
                Rule::unique('offer_codes', 'code')->ignore($offer?->id),
            ],
            'description' => ['nullable', 'string', 'max:500'],
            'discount_type' => ['required', Rule::in([OfferCode::TYPE_PERCENTAGE, OfferCode::TYPE_FIXED])],
            'discount_value' => [
                'required',
                'numeric',
                'gt:0',
                'max:99999999.99',
                function (string $attribute, mixed $value, Closure $fail) use ($isPercentage): void {
                    if ($isPercentage && (float) $value > 100) {
                        $fail('A percentage discount cannot exceed 100.');
                    }
                },
            ],
            'min_order_amount' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'max_discount' => ['sometimes', 'nullable', 'numeric', 'gt:0', 'max:99999999.99'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => [
                'nullable',
                'date',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if ($value && $this->filled('starts_at')
                        && strtotime((string) $value) < strtotime((string) $this->input('starts_at'))) {
                        $fail('The expiry date must be on or after the start date.');
                    }
                },
            ],
            'usage_limit' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:1000000'],
            'per_customer_limit' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:1000000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.required' => 'An offer code is required.',
            'code.regex' => 'Use letters, numbers, hyphens and underscores only (e.g. WELCOME10).',
            'code.unique' => 'This offer code is already in use.',
            'discount_value.gt' => 'The discount value must be greater than zero.',
            'max_discount.gt' => 'The maximum discount must be greater than zero.',
            'expires_at.date' => 'Enter a valid expiry date.',
            'usage_limit.min' => 'The usage limit must be at least 1 (leave blank for unlimited).',
            'per_customer_limit.min' => 'The per-customer limit must be at least 1 (leave blank for unlimited).',
        ];
    }
}
