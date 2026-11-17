<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | WhatsApp / SpringEdge
    |--------------------------------------------------------------------------
    |
    | Shared credentials reuse the existing environment variable names. The OTP
    | flow in AuthController keeps reading its own configuration and is not
    | changed by these order-notification settings.
    |
    */
    'whatsapp' => [
        'service_url' => env('WHATSAPP_SERVICE_URL'),
        'api_key' => env('WHATSAPP_API_KEY', env('WHATSAPP_ACCESS_TOKEN')),
        'access_token' => env('WHATSAPP_ACCESS_TOKEN'),
        'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        'template_name' => env('WHATSAPP_TEMPLATE_NAME'),
        // Optional CA bundle path. When empty, Laravel/PHP's secure default
        // trust store is used; certificate verification is never disabled.
        'ca_bundle' => env('WHATSAPP_CA_BUNDLE'),
        'language' => env('WHATSAPP_TEMPLATE_LANGUAGE', 'en'),
        'timeout' => (int) env('WHATSAPP_TIMEOUT', 15),
        'templates' => [
            'order_confirmed' => env('WHATSAPP_ORDER_CONFIRMED_TEMPLATE', 'order_confirmed'),
            'order_status_update' => env(
                'WHATSAPP_ORDER_STATUS_TEMPLATE',
                env('WHATSAPP_ORDER_STATUS_UPDATE_TEMPLATE', 'order_status_update')
            ),
        ],
        // Each order template can use its own approved language.
        'template_languages' => [
            'order_confirmed' => env('WHATSAPP_ORDER_CONFIRMED_LANGUAGE', env('WHATSAPP_TEMPLATE_LANGUAGE', 'en')),
            'order_status_update' => env('WHATSAPP_ORDER_STATUS_LANGUAGE', env('WHATSAPP_TEMPLATE_LANGUAGE', 'en')),
        ],
    ],

];
