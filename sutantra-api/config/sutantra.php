<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Initial SUPER_ADMIN account
    |--------------------------------------------------------------------------
    |
    | Used by Database\Seeders\SuperAdminSeeder to provision the first Super
    | Admin. The seeder is idempotent: it only creates the account when no
    | SUPER_ADMIN exists yet, so a rotated password is never overwritten.
    |
    | Only the bcrypt HASH is ever written to the database. The password below
    | is a weak initial value and MUST be rotated before production.
    |
    */

    'super_admin' => [
        'name' => env('SUPER_ADMIN_NAME', 'Super Admin'),
        'email' => env('SUPER_ADMIN_EMAIL', 'greddy.naru@gmail.com'),
        'phone' => env('SUPER_ADMIN_PHONE', '7702611919'),
        'password' => env('SUPER_ADMIN_PASSWORD', '543210'),
    ],

];
