<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Shared media storage (outside the application root)
    |--------------------------------------------------------------------------
    |
    | All product / category / banner / logo images live OUTSIDE both app
    | directories at D:\Sutantra\uploads\{logo,products,categories,banners}.
    | Database rows store RELATIVE references like "products/abc.webp".
    |
    */

    'base_path' => env('UPLOADS_PATH', base_path('../uploads')),

    'allowed_types' => ['webp', 'jpg', 'jpeg', 'png', 'gif'],

    'max_size_kb' => (int) env('UPLOADS_MAX_SIZE_KB', 5120),

];