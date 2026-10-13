<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PDO;

/**
 * One-way, idempotent import of the legacy data from MySQL database `db_sutantra`
 * into the database configured for this Laravel app (`db_sutantra_laravel`).
 *
 * Safety guards:
 *  - refuses to run when the target database IS `db_sutantra`;
 *  - aborts before touching anything if any business table already has rows;
 *  - runs inside a single transaction and rolls back on error;
 *  - preserves primary keys so legacy foreign keys remain valid;
 *  - remaps image URLs from "/uploads/X/file.webp" to "X/file.webp";
 *  - carries legacy user hashes/passwords over unchanged.
 */
class ImportLegacyData extends Command
{
    protected $signature = 'sutantra:import-legacy';

    protected $description = 'Import legacy data from db_sutantra into the current database (idempotent).';

    /** @var array<string, array{cols: array<string,string>, bools: list<string>, images: list<string>, hashes?: list<string>}> */
    private array $plan = [
        'users' => [
            'cols' => [
                'id' => 'id', 'email' => 'email', 'phone' => 'phone',
                'password' => 'password', 'verification_code' => 'verification_code',
                'role' => 'role', 'is_active' => 'is_active',
                'created_timestamp' => 'created_at', 'updated_timestamp' => 'updated_at',
            ],
            'bools' => ['is_active'],
            'images' => [],
            'hashes' => ['password'],
        ],
        'product_categories' => [
            'cols' => [
                'id' => 'id', 'name' => 'name', 'description' => 'description',
                'active' => 'active', 'image_url' => 'image_url',
                'created_at' => 'created_at', 'updated_at' => 'updated_at',
            ],
            'bools' => ['active'],
            'images' => ['image_url'],
        ],
        'products' => [
            'cols' => [
                'id' => 'id', 'name' => 'name', 'description' => 'description',
                'category_id' => 'category_id', 'price' => 'price', 'unit' => 'unit',
                'image_url' => 'image_url', 'available' => 'available',
                'created_at' => 'created_at', 'updated_at' => 'updated_at',
                'stock_quantity' => 'stock_quantity',
            ],
            'bools' => ['available'],
            'images' => ['image_url'],
        ],
        'home_page_banners' => [
            'cols' => [
                'id' => 'id', 'title' => 'title', 'subtitle' => 'subtitle',
                'image_url' => 'image_url', 'target_url' => 'target_url',
                'active' => 'active', 'display_order' => 'display_order',
                'created_at' => 'created_at', 'updated_at' => 'updated_at',
            ],
            'bools' => ['active'],
            'images' => ['image_url'],
        ],
        'home_page_policies' => [
            'cols' => [
                'id' => 'id', 'slug' => 'slug', 'title' => 'title', 'content' => 'content',
                'active' => 'active', 'display_order' => 'display_order',
                'created_at' => 'created_at', 'updated_at' => 'updated_at',
            ],
            'bools' => ['active'],
            'images' => [],
        ],
        'home_page_vision' => [
            'cols' => [
                'id' => 'id', 'heading' => 'heading', 'vision_text' => 'vision_text',
                'created_at' => 'created_at', 'updated_at' => 'updated_at',
            ],
            'bools' => [],
            'images' => [],
        ],
        'carts' => [
            'cols' => [
                'id' => 'id', 'user_id' => 'user_id', 'status' => 'status',
                'created_at' => 'created_at', 'updated_at' => 'updated_at',
            ],
            'bools' => [],
            'images' => [],
        ],
        'cart_items' => [
            'cols' => [
                'id' => 'id', 'cart_id' => 'cart_id', 'product_id' => 'product_id',
                'quantity' => 'quantity', 'unit_price' => 'unit_price',
                'created_at' => 'created_at', 'updated_at' => 'updated_at',
            ],
            'bools' => [],
            'images' => [],
        ],
        'orders' => [
            'cols' => [
                'id' => 'id', 'order_number' => 'order_number', 'user_id' => 'user_id',
                'status' => 'status', 'payment_status' => 'payment_status',
                'subtotal' => 'subtotal', 'discount_amount' => 'discount_amount',
                'delivery_charge' => 'delivery_charge', 'tax_amount' => 'tax_amount',
                'total_amount' => 'total_amount', 'currency' => 'currency',
                'customer_name' => 'customer_name', 'customer_phone' => 'customer_phone',
                'customer_email' => 'customer_email', 'delivery_address' => 'delivery_address',
                'created_at' => 'created_at', 'updated_at' => 'updated_at',
            ],
            'bools' => [],
            'images' => [],
        ],
        'order_items' => [
            'cols' => [
                'id' => 'id', 'order_id' => 'order_id', 'product_id' => 'product_id',
                'product_name' => 'product_name', 'quantity' => 'quantity',
                'unit_price' => 'unit_price', 'total_price' => 'total_price',
                'unit' => 'unit', 'created_at' => 'created_at',
            ],
            'bools' => [],
            'images' => [],
        ],
        'payments' => [
            'cols' => [
                'id' => 'id', 'order_id' => 'order_id', 'gateway' => 'gateway',
                'payment_method' => 'payment_method', 'payment_reference' => 'payment_reference',
                'gateway_order_id' => 'gateway_order_id', 'gateway_payment_id' => 'gateway_payment_id',
                'amount' => 'amount', 'currency' => 'currency', 'status' => 'status',
                'created_at' => 'created_at', 'updated_at' => 'updated_at',
                'provider_reference' => 'provider_reference', 'payment_status' => 'payment_status',
            ],
            'bools' => [],
            'images' => [],
        ],
    ];

    public function handle(): int
    {
        if (config('database.default') !== 'mysql') {
            $this->error('This command requires the mysql connection.');

            return self::FAILURE;
        }

        $targetDb = (string) config('database.connections.mysql.database');
        if ($targetDb === 'db_sutantra') {
            $this->error('Refusing to import INTO db_sutantra (that is the read-only source).');

            return self::FAILURE;
        }

        // Open a dedicated PDO to the legacy source database using the same credentials.
        $mysql = config('database.connections.mysql');
        try {
            $source = new PDO(
                "mysql:host={$mysql['host']};port={$mysql['port']};dbname=db_sutantra;charset=utf8mb4",
                $mysql['username'],
                $mysql['password'],
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
            $source->exec('SET NAMES utf8mb4');
        } catch (\PDOException $e) {
            $this->error('Could not connect to source database db_sutantra: '.$e->getMessage());

            return self::FAILURE;
        }

        // Idempotency guard: never double-import over existing rows.
        foreach (array_keys($this->plan) as $table) {
            $count = DB::table($table)->count();
            if ($count > 0) {
                $this->line("Table `{$table}` already has {$count} row(s). Data appears already imported.");

                return self::SUCCESS;
            }
        }

        DB::beginTransaction();

        try {
            $totals = [];

            foreach ($this->plan as $table => $spec) {
                $rows = $source->query("SELECT * FROM `{$table}` ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
                $inserts = [];

                foreach ($rows as $row) {
                    $insert = [];
                    foreach ($spec['cols'] as $srcCol => $dstCol) {
                        $value = $row[$srcCol] ?? null;

                        if (in_array($dstCol, $spec['bools'], true)) {
                            $value = $this->toBool($value);
                        }

                        if (in_array($dstCol, $spec['images'], true) && is_string($value) && $value !== '') {
                            $value = $this->remapImage($value);
                        }

                        if (isset($spec['hashes']) && in_array($dstCol, $spec['hashes'], true)) {
                            $value = $this->hashIfLegacy($value);
                        }

                        $insert[$dstCol] = $value;
                    }

                    $inserts[] = $insert;
                }

                foreach (array_chunk($inserts, 200) as $chunk) {
                    if ($chunk !== []) {
                        DB::table($table)->insert($chunk);
                    }
                }

                $totals[$table] = count($inserts);
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->error('Import failed, transaction rolled back: '.$e->getMessage());

            return self::FAILURE;
        }

        foreach ($totals as $table => $count) {
            $this->line(sprintf('%-20s %6d rows', $table, $count));
        }

        $this->info('Import complete.');

        return self::SUCCESS;
    }

    private function toBool(mixed $value): bool
    {
        return in_array($value, [true, 1, '1', "\x01"], true);
    }

    /**
     * The legacy Java app stored plaintext passwords (it logged in by
     * verification code). Upgrade them to bcrypt so the new password-only
     * login works while keeping the known password value unchanged.
     */
    private function hashIfLegacy(mixed $value): mixed
    {
        if (! is_string($value) || $value === '') {
            return $value;
        }

        foreach (['$2y$', '$2a$', '$2b$', '$argon2id$', '$argon2i$', '$argon2'] as $prefix) {
            if (str_starts_with($value, $prefix)) {
                return $value;
            }
        }

        return Hash::make($value);
    }

    private function remapImage(string $value): string
    {
        $trimmed = ltrim($value, '/');
        if (str_starts_with($trimmed, 'uploads/')) {
            $trimmed = substr($trimmed, strlen('uploads/'));
        }

        return str_replace('\\', '/', $trimmed);
    }
}