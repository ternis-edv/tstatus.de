<?php
/**
 * tstatus.de Modern PSR-4 HTTP Router
 * Supports URL parameter matching, method dispatching, middleware, and domain shortlinks.
 */

declare(strict_types=1);

namespace Tstatus;

class Router {
    private array $routes = [];

    public function get(string $path, callable|string|array $handler, array $middlewares = []): void {
        $this->addRoute('GET', $path, $handler, $middlewares);
    }

    public function post(string $path, callable|string|array $handler, array $middlewares = []): void {
        $this->addRoute('POST', $path, $handler, $middlewares);
    }

    public function delete(string $path, callable|string|array $handler, array $middlewares = []): void {
        $this->addRoute('DELETE', $path, $handler, $middlewares);
    }

    private function addRoute(string $method, string $path, callable|string|array $handler, array $middlewares): void {
        $this->routes[] = [
            'method' => strtoupper($method),
            'path' => $path,
            'handler' => $handler,
            'middlewares' => $middlewares
        ];
    }

    public function dispatch(string $uri, string $method, string $host = ''): bool {
        $uriPath = parse_url($uri, PHP_URL_PATH) ?? '/';

        // 1. Check Multiple Domains & Shortlink Redirects (e.g. go.tstatus.de)
        if ($host === 'go.tstatus.de' || str_starts_with($uriPath, '/gh-latest') || str_starts_with($uriPath, '/go/gh-latest')) {
            $commitHash = get_git_commit_hash();
            header("Location: https://github.com/ternis-edv/tstatus.de/commit/{$commitHash}", true, 302);
            return true;
        }

        if ($host === 'go.tstatus.de' && ($uriPath === '/status' || $uriPath === '/')) {
            header("Location: https://tstatus.de/", true, 302);
            return true;
        }

        // 2. Iterate registered routes
        foreach ($this->routes as $route) {
            if ($route['method'] !== strtoupper($method)) {
                continue;
            }

            $pattern = preg_replace('#\{([a-zA-Z0-9_]+)\}#', '([^/]+)', $route['path']);
            $pattern = '#^' . $pattern . '$#';

            if (preg_match($pattern, $uriPath, $matches)) {
                array_shift($matches); // Remove full match

                // Execute Route Middlewares
                foreach ($route['middlewares'] as $middleware) {
                    if (is_callable($middleware)) {
                        call_user_func($middleware);
                    } elseif (is_array($middleware) && is_callable($middleware)) {
                        call_user_func($middleware);
                    }
                }

                // Execute Handler
                $handler = $route['handler'];
                if (is_callable($handler)) {
                    call_user_func_array($handler, $matches);
                    return true;
                } elseif (is_string($handler) && file_exists($handler)) {
                    require $handler;
                    return true;
                }
            }
        }

        // Static file fallback check
        if (file_exists(__DIR__ . '/../public' . $uriPath) && is_file(__DIR__ . '/../public' . $uriPath)) {
            return false;
        }

        // 404 Not Found fallback
        if (str_starts_with($uriPath, '/api/')) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'error' => 'API endpoint not found']);
            return true;
        }

        http_response_code(404);
        echo "<!DOCTYPE html><html><body style='background:#0b0f19;color:#fff;font-family:sans-serif;text-align:center;padding-top:4rem;'><h1>404 - Page Not Found</h1><p><a href='/' style='color:#3b82f6;'>Return to tstatus.de Homepage</a></p></body></html>";
        return true;
    }
}
