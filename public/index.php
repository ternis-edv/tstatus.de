<?php
/**
 * tstatus.de Public Entry Point & Front Controller
 */

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../includes/router.php';

$uri = $_SERVER['REQUEST_URI'] ?? '/';
$host = $_SERVER['HTTP_HOST'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Handle go.tstatus.de shortlinks or /gh-latest route
if ($host === 'go.tstatus.de' || str_starts_with($uri, '/gh-latest') || str_starts_with($uri, '/go/gh-latest')) {
    $commitHash = get_git_commit_hash();
    $targetUrl = "https://github.com/ternis-edv/tstatus.de/commit/{$commitHash}";
    header("Location: {$targetUrl}", true, 302);
    exit;
}

// Handle REST API requests
if (str_starts_with($uri, '/api/info')) {
    require __DIR__ . '/../api/info.php';
    exit;
} elseif (str_starts_with($uri, '/api/monitors')) {
    require __DIR__ . '/../api/monitors.php';
    exit;
} elseif (str_starts_with($uri, '/api/incidents')) {
    require __DIR__ . '/../api/incidents.php';
    exit;
} elseif (str_starts_with($uri, '/api/check')) {
    require __DIR__ . '/../api/check.php';
    exit;
}

// Serve dedicated service detail shell for /s/{slug}
if (preg_match('#^/s/([a-zA-Z0-9\-_]+)$#', parse_url($uri, PHP_URL_PATH) ?? '')) {
    require __DIR__ . '/service.html';
    exit;
}

// Main Statuspage Dashboard Route
$router = new Router();
$router->get('/', function() {
    require __DIR__ . '/index.html';
});

// Dispatch router
$router->dispatch($uri, $method);
