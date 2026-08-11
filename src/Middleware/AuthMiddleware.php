<?php
/**
 * tstatus.de Authentication Middleware
 */

declare(strict_types=1);

namespace Tstatus\Middleware;

use Tstatus\Auth;

class AuthMiddleware {
    public static function handle(): void {
        if (!Auth::check()) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Unauthorized. Admin authentication required.'
            ]);
            exit;
        }
    }
}
