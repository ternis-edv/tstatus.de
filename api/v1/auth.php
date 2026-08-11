<?php
/**
 * tstatus.de API v1 - Authentication Endpoint
 */

declare(strict_types=1);

header('Content-Type: application/json');

use Tstatus\Auth;

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '';

if (str_ends_with($path, '/login') && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');

    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Username and password are required.']);
        exit;
    }

    if (Auth::login($username, $password)) {
        $user = Auth::user();
        echo json_encode(['success' => true, 'data' => $user]);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid username or password.']);
    }
    exit;
} elseif (str_ends_with($path, '/logout') && $method === 'POST') {
    Auth::logout();
    echo json_encode(['success' => true, 'data' => ['message' => 'Logged out successfully.']]);
    exit;
} elseif (str_ends_with($path, '/me') && $method === 'GET') {
    if (Auth::check()) {
        echo json_encode(['success' => true, 'authenticated' => true, 'data' => Auth::user()]);
    } else {
        echo json_encode(['success' => true, 'authenticated' => false, 'data' => null]);
    }
    exit;
}

http_response_code(404);
echo json_encode(['success' => false, 'error' => 'Auth action not found.']);
