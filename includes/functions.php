<?php
/**
 * tstatus.de Helper Functions
 */

declare(strict_types=1);

/**
 * Generate clean URL slug from string
 */
function slugify(string $text): string {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    $text = preg_replace('~[^-\w]+~', '', $text);
    $text = trim($text, '-');
    $text = preg_replace('~-+~', '-', $text);
    $text = strtolower($text);
    return empty($text) ? 'n-a' : $text;
}

/**
 * Format uptime badge class
 */
function getStatusBadgeClass(string $status): string {
    return match ($status) {
        'operational' => 'operational',
        'degraded' => 'degraded',
        'outage' => 'outage',
        'maintenance' => 'maintenance',
        default => 'operational'
    };
}
