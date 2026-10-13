<?php

namespace Database\Seeders;

use App\Models\HomePagePolicy;
use Illuminate\Database\Seeder;

class HomePagePolicySeeder extends Seeder
{
    /**
     * Seed the footer policies (About Us, Privacy, Terms, Shipping, Cancellation/Refunds).
     * Idempotent: upserts by slug; preserves edits by not touching existing rows.
     */
    public function run(): void
    {
        $policies = [
            [
                'slug' => 'about-us',
                'title' => 'About Us',
                'display_order' => 1,
                'content' => "Sutantra Foods brings the richness of traditional Indian flavours into every home. We craft delicious sweets, crispy dry snacks, authentic pickles and flavourful spices using time-honoured recipes and quality ingredients.\n\nRooted in Tradition. Crafted with Care. Shared with Love.",
            ],
            [
                'slug' => 'privacy-policy',
                'title' => 'Privacy Policy',
                'display_order' => 2,
                'content' => "We respect your privacy. The information you provide (name, email, phone and delivery address) is used only to process your orders, manage your account and keep you informed about your purchases.\n\nWe do not sell or share your personal information with third parties except as required to fulfil your order (for example, delivery partners) or as required by law.",
            ],
            [
                'slug' => 'terms-and-conditions',
                'title' => 'Terms and Conditions',
                'display_order' => 3,
                'content' => "By using the Sutantra Foods website you agree to these terms. Product images are indicative; actual products may vary slightly. Prices are listed in Indian Rupees (INR) and may change without prior notice.\n\nAll content on this site is the property of Sutantra Foods and may not be reproduced without permission.",
            ],
            [
                'slug' => 'shipping-and-delivery-policy',
                'title' => 'Shipping and Delivery Policy',
                'display_order' => 4,
                'content' => "Orders are processed and shipped within 2-4 business days after confirmation. Delivery times vary by location.\n\nPlease provide an accurate delivery address and a reachable phone number. We are not responsible for delays caused by incorrect addresses or circumstances beyond our control.",
            ],
            [
                'slug' => 'cancellation-returns-and-refund-policy',
                'title' => 'Cancellation, Returns and Refund Policy',
                'display_order' => 5,
                'content' => "Orders may be cancelled before they are shipped. Once an order is dispatched, it cannot be cancelled.\n\nIf you receive a damaged or incorrect product, please contact us within 48 hours of delivery with photos. Eligible refunds are processed to the original payment method within 7-10 business days.",
            ],
            [
                'slug' => 'contact-us',
                'title' => 'Contact Us',
                'display_order' => 6,
                'content' => "Have a question about an order or a product? Reach out to us:\n\n- Phone: +91 (provided on the website)\n- Email: support@sutantrafoods.in\n\nWe are happy to help between 9:00 AM and 6:00 PM IST, Monday to Saturday.",
            ],
        ];

        foreach ($policies as $policy) {
            HomePagePolicy::query()->firstOrCreate(
                ['slug' => $policy['slug']],
                ['title' => $policy['title'], 'content' => $policy['content'], 'active' => true, 'display_order' => $policy['display_order']]
            );
        }
    }
}