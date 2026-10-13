<?php

use App\Http\Middleware\EnsureRole;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
 ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            HandleCors::class,
        ]);

        $middleware->alias([
            'role' => EnsureRole::class,
        ]);

        // Unauthenticated API requests must get a JSON 401, never a redirect to
        // a (non-existent, API-only) login route.
        $middleware->redirectGuestsTo(
            fn (Request $request) => $request->expectsJson() || $request->is('api/*') ? null : '/login'
        );

        $middleware->throttleApi('60,1');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            function ($request, \Throwable $exception): bool {
                return $request->is('api/*')
                    || $request->expectsJson();
            }
        );
    })->create();
