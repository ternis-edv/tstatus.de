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

// Route all API v1 calls
if (str_starts_with($uri, '/api/v1/')) {
    $path = parse_url($uri, PHP_URL_PATH) ?? '';
    $endpoint = preg_replace('#^/api/v1/?#', '', $path);
    $endpoint = trim($endpoint, '/');

    if ($endpoint === 'info' || str_starts_with($endpoint, 'info/')) {
        require __DIR__ . '/../api/v1/info.php';
        exit;
    } elseif ($endpoint === 'monitors' || str_starts_with($endpoint, 'monitors/')) {
        require __DIR__ . '/../api/v1/monitors.php';
        exit;
    } elseif ($endpoint === 'incidents' || str_starts_with($endpoint, 'incidents/')) {
        require __DIR__ . '/../api/v1/incidents.php';
        exit;
    } elseif ($endpoint === 'check' || str_starts_with($endpoint, 'check/')) {
        require __DIR__ . '/../api/v1/check.php';
        exit;
    }
}

// Backward compatibility redirects for legacy /api/* calls
if (str_starts_with($uri, '/api/')) {
    $newUri = str_replace('/api/', '/api/v1/', $uri);
    header("Location: {$newUri}", true, 307);
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
