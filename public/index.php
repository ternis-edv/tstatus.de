<?php
/**
 * tstatus.de Public Entry Point & Front Controller
 */

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

use Tstatus\Router;
use Tstatus\Auth;

Auth::initSession();

$uri = $_SERVER['REQUEST_URI'] ?? '/';
$host = $_SERVER['HTTP_HOST'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Handle API v1 auth routes
if (str_starts_with($uri, '/api/v1/auth')) {
    require __DIR__ . '/../api/v1/auth.php';
    exit;
}

// Route API v1 requests
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

$router = new Router();

// Main Statuspage Dashboard Route
$router->get('/', function() {
    require __DIR__ . '/index.html';
});

// Dedicated service detail shell route
$router->get('/s/{slug}', function() {
    require __DIR__ . '/service.html';
});

// Dispatch router
$router->dispatch($uri, $method, $host);
