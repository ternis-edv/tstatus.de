<?php
/**
 * tstatus.de Request Router & Front Controller Handler
 */

declare(strict_types=1);

class Router {
    private array $routes = [];

    public function get(string $path, callable|string $handler): void {
        $this->routes['GET'][$path] = $handler;
    }

    public function post(string $path, callable|string $handler): void {
        $this->routes['POST'][$path] = $handler;
    }

    public function dispatch(string $uri, string $method): bool {
        $path = parse_url($uri, PHP_URL_PATH) ?? '/';

        // Check exact match
        if (isset($this->routes[$method][$path])) {
            $handler = $this->routes[$method][$path];
            if (is_callable($handler)) {
                call_user_func($handler);
                return true;
            } elseif (is_string($handler) && file_exists($handler)) {
                require $handler;
                return true;
            }
        }

        // Match /s/{slug} pattern
        if ($method === 'GET' && preg_match('#^/s/([a-zA-Z0-9\-_]+)$#', $path, $matches)) {
            $slug = $matches[1];
            self::handleServiceDetail($slug);
            return true;
        }

        // Fallback static files
        if (file_exists(__DIR__ . '/../public' . $path) && is_file(__DIR__ . '/../public' . $path)) {
            return false; // let web server handle static file
        }

        http_response_code(404);
        echo "<!DOCTYPE html><html><body style='background:#0b0f19;color:#fff;font-family:sans-serif;text-align:center;padding-top:4rem;'><h1>404 - Service Page Not Found</h1><p><a href='/' style='color:#3b82f6;'>Return to tstatus.de Homepage</a></p></body></html>";
        return true;
    }

    private static function handleServiceDetail(string $slug): void {
        global $pdo;
        if (!$pdo) {
            require_once __DIR__ . '/../bootstrap.php';
        }

        $stmt = $pdo->prepare("SELECT * FROM monitors WHERE slug = ? OR id = ?");
        $stmt->execute([$slug, $slug]);
        $monitor = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$monitor) {
            http_response_code(404);
            echo "<!DOCTYPE html><html><body style='background:#0b0f19;color:#fff;font-family:sans-serif;text-align:center;padding-top:4rem;'><h1>404 - Service '$slug' Not Found</h1><p><a href='/' style='color:#3b82f6;'>Return to tstatus.de Homepage</a></p></body></html>";
            return;
        }

        // Fetch history for this monitor
        $hStmt = $pdo->prepare("SELECT day_offset as day, status, latency FROM check_history WHERE monitor_id = ? ORDER BY day_offset ASC");
        $hStmt->execute([$monitor['id']]);
        $history = $hStmt->fetchAll(PDO::FETCH_ASSOC);

        require __DIR__ . '/../views/service_detail.php';
    }
}
