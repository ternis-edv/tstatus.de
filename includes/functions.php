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
 * Get current short Git commit ID dynamically
 */
function get_git_commit_hash(): string {
    if (function_exists('exec')) {
        $hash = @exec('git rev-parse --short HEAD');
        if (!empty($hash) && preg_match('/^[a-f0-9]{7,40}$/i', trim($hash))) {
            return trim($hash);
        }
    }
    
    $headFile = __DIR__ . '/../.git/HEAD';
    if (file_exists($headFile)) {
        $head = trim(file_get_contents($headFile));
        if (str_starts_with($head, 'ref: ')) {
            $refPath = __DIR__ . '/../.git/' . substr($head, 5);
            if (file_exists($refPath)) {
                return substr(trim(file_get_contents($refPath)), 0, 7);
            }
        } elseif (preg_match('/^[a-f0-9]{7,40}$/i', $head)) {
            return substr($head, 0, 7);
        }
    }

    return '276954c';
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
