<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Stores and removes images in the shared uploads directory
 * (D:\Sutantra\uploads\{products,categories,banners}) which lives OUTSIDE the
 * application root. Callers persist the returned RELATIVE reference
 * (e.g. "products/uuid.webp") and serve it through GET /api/media/{reference}.
 */
class ImageUploadService
{
    /**
     * Validate-independent move of an uploaded image into uploads/{folder}.
     *
     * @return string relative reference, e.g. "products/9f2c....webp"
     */
    public function store(UploadedFile $file, string $folder): string
    {
        $folder = trim($folder, '/\\');
        $base = rtrim((string) config('uploads.base_path'), '/\\');

        if ($base === '' || $folder === '') {
            throw new RuntimeException('Uploads path is not configured.');
        }

        $directory = $base.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $folder);

        if (! is_dir($directory) && ! @mkdir($directory, 0775, true) && ! is_dir($directory)) {
            throw new RuntimeException("Unable to create upload directory: {$folder}");
        }

        $extension = strtolower($file->getClientOriginalExtension()
            ?: $file->guessExtension()
            ?: 'bin');

        $filename = Str::uuid()->toString().'.'.$extension;

        $file->move($directory, $filename);

        return $folder.'/'.$filename;
    }

    /**
     * Delete a previously stored relative reference. Absolute URLs, data URIs
     * and any path that escapes the uploads base are ignored for safety.
     */
    public function delete(?string $reference): void
    {
        if ($reference === null || $reference === '') {
            return;
        }

        if (preg_match('#^[a-z][a-z0-9+.-]*://#i', $reference) === 1
            || str_starts_with($reference, 'data:')) {
            return;
        }

        $base = realpath(rtrim((string) config('uploads.base_path'), '/\\'));

        if ($base === false) {
            return;
        }

        $normalized = str_replace('\\', '/', ltrim($reference, '/'));

        if (str_contains($normalized, '..')) {
            return;
        }

        $target = realpath($base.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $normalized));

        if ($target === false || ! is_file($target)) {
            return;
        }

        $prefix = rtrim(str_replace('\\', '/', $base), '/').'/';

        if (! str_starts_with(str_replace('\\', '/', $target), $prefix)) {
            return;
        }

        @unlink($target);
    }
}
