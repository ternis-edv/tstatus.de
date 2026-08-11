<?php
/**
 * tstatus.de Public Entry Point & Front Controller
 */

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../includes/router.php';

$uri = $_SERVER['REQUEST_URI'] ?? '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

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
    require __DIR__ . '/../index.html';
});

// Dispatch router
$router->dispatch($uri, $method);
