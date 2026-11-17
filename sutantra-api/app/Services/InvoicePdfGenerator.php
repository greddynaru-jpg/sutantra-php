<?php

namespace App\Services;

/**
 * Minimal, dependency-free A4 PDF writer for SUTANTRA invoices.
 *
 * Uses the standard Helvetica Type1 fonts and uncompressed content streams, so
 * no new Composer package, configuration value or database table is needed.
 */
final class InvoicePdfGenerator
{
    private const PAGE_WIDTH = 595.28;
    private const PAGE_HEIGHT = 841.89;
    private const MARGIN = 42.0;
    private const BOTTOM_LIMIT = 80.0;

    /** @var list<string> */
    private array $pages = [];

    private string $stream = '';

    private float $y = 0.0;

    /** @var array<string,mixed> */
    private array $invoice = [];

    /**
     * @param  array<string,mixed>  $invoice
     */
    public function generate(array $invoice): string
    {
        $this->invoice = $invoice;
        $this->pages = [];
        $this->startPage();

        $this->drawHeader();
        $this->drawParties();
        $this->drawItems();
        $this->drawTotals();
        $this->drawFooter();

        $this->endPage();

        return $this->buildPdf();
    }

    private function startPage(): void
    {
        $this->stream = '';
        $this->y = self::MARGIN;
    }

    private function endPage(): void
    {
        $this->pages[] = $this->stream;
    }

    private function drawHeader(): void
    {
        $green = [0.157, 0.349, 0.263];
        $muted = [0.408, 0.408, 0.408];

        $this->text(self::MARGIN, $this->y, 'SUTANTRA', 22, true, $green);
        $this->y += 20;
        $this->text(self::MARGIN, $this->y, 'TAX INVOICE', 10, false, $muted);
        $this->y += 14;
        $this->rule($this->y);
        $this->y += 15;

        $this->text(self::MARGIN, $this->y, 'Invoice: '.$this->str('invoiceNumber'), 10, true);
        $this->textRight(self::PAGE_WIDTH - self::MARGIN, $this->y, 'Order: '.$this->str('orderNumber'), 10);
        $this->y += 16;
        $this->text(self::MARGIN, $this->y, 'Date: '.$this->str('date'), 9, false, $muted);
        $this->textRight(self::PAGE_WIDTH - self::MARGIN, $this->y, 'Payment: '.$this->str('paymentStatusLabel'), 9, false, $muted);
        $this->y += 24;
    }

    private function drawParties(): void
    {
        $left = self::MARGIN;
        $right = self::MARGIN + 290.0;
        $muted = [0.408, 0.408, 0.408];

        $address = $this->lines('deliveryAddress');
        $rowCount = max(3, count($address));
        $this->ensureSpace(24 + ($rowCount * 14));

        $this->text($left, $this->y, 'BILL TO', 9, true, $muted);
        $this->text($right, $this->y, 'DELIVER TO', 9, true, $muted);
        $this->y += 15;

        $this->text($left, $this->y, $this->str('customerName'), 11, true);
        if ($this->str('customerEmail') !== '') {
            $this->text($left, $this->y + 14, $this->str('customerEmail'), 9, false, $muted);
        }
        if ($this->str('customerPhone') !== '') {
            $this->text($left, $this->y + 28, 'Phone: '.$this->str('customerPhone'), 9, false, $muted);
        }

        foreach ($address as $index => $line) {
            $this->text($right, $this->y + ($index * 14), $line, 9);
        }

        $this->y += ($rowCount * 14) + 14;
        $this->rule($this->y);
        $this->y += 16;
    }

    private function drawItems(): void
    {
        $muted = [0.408, 0.408, 0.408];
        $this->ensureSpace(70);

        $this->text(self::MARGIN, $this->y, 'ITEMS', 9, true, $muted);
        $this->y += 16;

        $this->text(self::MARGIN, $this->y, 'Description', 9, true, $muted);
        $this->text(330.0, $this->y, 'Qty', 9, true, $muted);
        $this->textRight(410.0, $this->y, 'Unit Price', 9, true, $muted);
        $this->textRight(self::PAGE_WIDTH - self::MARGIN, $this->y, 'Amount', 9, true, $muted);
        $this->y += 8;
        $this->rule($this->y);
        $this->y += 16;

        $items = $this->invoice['items'] ?? [];
        if (! is_array($items) || $items === []) {
            $this->text(self::MARGIN, $this->y, 'No items recorded.', 9, false, $muted);
            $this->y += 18;

            return;
        }

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $name = (string) ($item['name'] ?? 'Item');
            $unit = (string) ($item['unit'] ?? '');
            $wrapped = $this->wrap($name, 250.0, 10.0);
            $lineCount = count($wrapped) + ($unit !== '' ? 1 : 0);
            $this->ensureSpace(18 + ($lineCount * 13));

            $firstLineY = $this->y;

            foreach ($wrapped as $line) {
                $this->text(self::MARGIN, $this->y, $line, 10);
                $this->y += 13;
            }

            if ($unit !== '') {
                $this->text(self::MARGIN, $this->y, 'Unit: '.$unit, 8, false, $muted);
                $this->y += 13;
            }

            $this->text(330.0, $firstLineY, (string) ($item['quantity'] ?? 0), 10);
            $this->textRight(410.0, $firstLineY, (string) ($item['unitPrice'] ?? ''), 10);
            $this->textRight(self::PAGE_WIDTH - self::MARGIN, $firstLineY, (string) ($item['amount'] ?? ''), 10, true);

            $this->y += 4;
            $this->rule($this->y, 0.94);
            $this->y += 12;
        }
    }

    private function drawTotals(): void
    {
        $muted = [0.408, 0.408, 0.408];
        $this->ensureSpace(130);
        $this->y += 8;

        $rows = [
            ['Subtotal', $this->str('subtotal'), false],
            ['Delivery Charge', $this->str('deliveryCharge'), false],
            ['Discount', $this->str('discount'), false],
            ['Tax', $this->str('tax'), false],
        ];

        foreach ($rows as [$label, $value, $bold]) {
            $this->textRight(410.0, $this->y, $label, 10, false, $muted);
            $this->textRight(self::PAGE_WIDTH - self::MARGIN, $this->y, $value, 10, $bold);
            $this->y += 17;
        }

        $this->rule($this->y);
        $this->y += 14;
        $this->textRight(410.0, $this->y, 'TOTAL', 12, true);
        $this->textRight(self::PAGE_WIDTH - self::MARGIN, $this->y, $this->str('total'), 12, true);
        $this->y += 28;
    }

    private function drawFooter(): void
    {
        $muted = [0.408, 0.408, 0.408];
        $this->ensureSpace(50);
        $this->rule($this->y);
        $this->y += 16;
        $this->text(self::MARGIN, $this->y, 'Thank you for shopping with SUTANTRA.', 9, false, $muted);
        $this->y += 14;
        $this->text(self::MARGIN, $this->y, 'This is a system-generated invoice.', 8, false, $muted);
    }

    private function ensureSpace(float $height): void
    {
        if ($this->y + $height <= self::PAGE_HEIGHT - self::BOTTOM_LIMIT) {
            return;
        }

        $this->endPage();
        $this->startPage();

        $green = [0.157, 0.349, 0.263];
        $this->text(self::MARGIN, $this->y, 'SUTANTRA - INVOICE (continued)', 12, true, $green);
        $this->y += 16;
        $this->text(self::MARGIN, $this->y, 'Invoice: '.$this->str('invoiceNumber'), 9);
        $this->textRight(self::PAGE_WIDTH - self::MARGIN, $this->y, 'Order: '.$this->str('orderNumber'), 9);
        $this->y += 18;
        $this->rule($this->y);
        $this->y += 16;
    }

    /**
     * @param  list<float>  $rgb
     */
    private function text(float $x, float $y, string $value, float $size = 10, bool $bold = false, array $rgb = [0.2, 0.2, 0.2]): void
    {
        $font = $bold ? '/F2' : '/F1';

        $this->stream .= sprintf(
            "q %.3f %.3f %.3f rg BT %s %.1f Tf %.2f %.2f Td (%s) Tj ET Q\n",
            $rgb[0],
            $rgb[1],
            $rgb[2],
            $font,
            $size,
            $x,
            self::PAGE_HEIGHT - $y,
            $this->pdfString($value)
        );
    }

    /**
     * @param  list<float>  $rgb
     */
    private function textRight(float $rightX, float $y, string $value, float $size = 10, bool $bold = false, array $rgb = [0.2, 0.2, 0.2]): void
    {
        $this->text($rightX - $this->textWidth($value, $size), $y, $value, $size, $bold, $rgb);
    }

    private function rule(float $y, float $gray = 0.85): void
    {
        $pdfY = self::PAGE_HEIGHT - $y;

        $this->stream .= sprintf(
            "q %.2f %.2f %.2f RG 0.7 w %.2f %.2f m %.2f %.2f l S Q\n",
            $gray,
            $gray,
            $gray,
            self::MARGIN,
            $pdfY,
            self::PAGE_WIDTH - self::MARGIN,
            $pdfY
        );
    }

    private function buildPdf(): string
    {
        $objects = [
            1 => '<< /Type /Catalog /Pages 2 0 R >>',
            3 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
            4 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
        ];

        $kids = [];
        foreach ($this->pages as $index => $content) {
            $pageId = 5 + (2 * $index);
            $contentId = $pageId + 1;
            $kids[] = $pageId.' 0 R';
            $objects[$pageId] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] '.
                '/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '.$contentId.' 0 R >>';
            $objects[$contentId] = '<< /Length '.strlen($content)." >>\nstream\n".$content."endstream";
        }

        ksort($objects);
        $objects[2] = '<< /Type /Pages /Kids ['.implode(' ', $kids).'] /Count '.count($kids).' >>';
        ksort($objects);

        $pdf = "%PDF-1.4\n";
        $offsets = [];

        foreach ($objects as $number => $object) {
            $offsets[$number] = strlen($pdf);
            $pdf .= $number." 0 obj\n".$object."\nendobj\n";
        }

        $xrefPosition = strlen($pdf);
        $size = count($objects) + 1;
        $pdf .= "xref\n0 {$size}\n0000000000 65535 f \n";

        for ($number = 1; $number < $size; $number++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$number] ?? 0);
        }

        $pdf .= "trailer\n<< /Size {$size} /Root 1 0 R >>\nstartxref\n{$xrefPosition}\n%%EOF\n";

        return $pdf;
    }

    /**
     * @return list<string>
     */
    private function lines(string $key): array
    {
        $value = $this->invoice[$key] ?? [];

        return is_array($value) ? array_values(array_map('strval', $value)) : [];
    }

    private function str(string $key): string
    {
        return (string) ($this->invoice[$key] ?? '');
    }

    /**
     * @return list<string>
     */
    private function wrap(string $text, float $maxWidth, float $size): array
    {
        $words = preg_split('/\s+/', trim($this->ascii($text))) ?: [];

        if ($words === []) {
            return [''];
        }

        $lines = [];
        $current = '';

        foreach ($words as $word) {
            $candidate = $current === '' ? $word : $current.' '.$word;

            if ($this->textWidth($candidate, $size) <= $maxWidth || $current === '') {
                $current = $candidate;
                continue;
            }

            $lines[] = $current;
            $current = $word;
        }

        if ($current !== '') {
            $lines[] = $current;
        }

        return $lines;
    }

    private function textWidth(string $text, float $size): float
    {
        return strlen($this->ascii($text)) * $size * 0.53;
    }

    private function pdfString(string $text): string
    {
        return str_replace(
            ['\\', '(', ')'],
            ['\\\\', '\\(', '\\)'],
            $this->ascii($text)
        );
    }

    private function ascii(string $text): string
    {
        $text = str_replace(
            ['₹', '’', '‘', '“', '”', '–', '—'],
            ['INR ', "'", "'", '"', '"', '-', '-'],
            $text
        );

        return preg_replace('/[^\x20-\x7E]/', '?', $text) ?? '';
    }
}
