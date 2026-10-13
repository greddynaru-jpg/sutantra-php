<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Serves images from the shared media directory D:\Sutantra\uploads (outside
 * both application folders) through a Laravel route, so no Apache/Nginx
 * alias configuration or storage:link symlink is required on Hostinger.
 *
 * Database rows store RELATIVE references like "products/abc.webp" and callers
 * build URLs as /api/media/{ref}.
 */
class MediaController extends Controller
{
    public function show(Request $request, string $path): BinaryFileResponse
    {
        // Normalise separators and refuse path traversal outright.
        if ($path === '' || str_contains($path, '..') || str_contains($path, "\0")) {
            abort(404);
        }

        $normalized = str_replace('\\', '/', $path);
        $base = rtrim((string) config('uploads.base_path'), '/\\');
        $realBase = realpath($base);

        if ($realBase === false) {
            abort(404, 'Media directory is not configured.');
        }

        $file = realpath($realBase . DIRECTORY_SEPARATOR . $normalized);

        if ($file === false || ! is_file($file)) {
            abort(404);
        }

        $prefix = rtrim(str_replace('\\', '/', $realBase), '/') . '/';
        if (! str_starts_with(str_replace('\\', '/', $file) . '/', $prefix)) {
            abort(404);
        }

        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (! in_array($ext, config('uploads.allowed_types', []), true)) {
            abort(404);
        }

        $contentTypes = [
            'webp' => 'image/webp',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
        ];

        return response()->file($file, [
            'Content-Type' => $contentTypes[$ext] ?? 'application/octet-stream',
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }
}