<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Guards the test harness itself: PHPUnit must ignore inherited DB settings and
 * always point at the disposable local/CI test schema.
 */
class DatabaseIsolationTest extends TestCase
{
    public function test_phpunit_pins_tests_to_the_isolated_database(): void
    {
        $this->assertSame('mysql', config('database.default'));
        $this->assertSame('127.0.0.1', config('database.connections.mysql.host'));
        $this->assertSame('3306', (string) config('database.connections.mysql.port'));
        $this->assertSame('db_sutantra_laravel_test', config('database.connections.mysql.database'));
        $this->assertSame('', (string) config('database.connections.mysql.url'));
    }
}
