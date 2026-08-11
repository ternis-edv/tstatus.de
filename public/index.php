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

// Handle REST API requests cleanly
if (str_starts_with($uri, '/api/monitors')) {
    require __DIR__ . '/../api/monitors.php';
    exit;
} elseif (str_starts_with($uri, '/api/incidents')) {
    require __DIR__ . '/../api/incidents.php';
    exit;
} elseif (str_starts_with($uri, '/api/check')) {
    require __DIR__ . '/../api/check.php';
    exit;
}

$router = new Router();

// Main Statuspage Dashboard Route
$router->get('/', function() {
    require __DIR__ . '/../views/dashboard.php';
});

// Dispatch router
$router->dispatch($uri, $method);
