<?php
/**
 * tstatus.de Monitors REST API Endpoint
 */

declare(strict_types=1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../bootstrap.php';
$pdo = Database::getConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $slug = $_GET['slug'] ?? $_GET['id'] ?? null;

        if ($slug) {
            $stmt = $pdo->prepare("SELECT * FROM monitors WHERE slug = ? OR id = ?");
            $stmt->execute([$slug, $slug]);
            $monitor = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$monitor) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Monitor not found']);
                exit;
            }

            $hStmt = $pdo->prepare("SELECT day_offset as day, status, latency FROM check_history WHERE monitor_id = ? ORDER BY day_offset ASC");
            $hStmt->execute([$monitor['id']]);
            $monitor['history'] = $hStmt->fetchAll(PDO::FETCH_ASSOC);
            $monitor['latency'] = (int)$monitor['latency'];
            $monitor['uptime'] = (float)$monitor['uptime'];

            echo json_encode(['success' => true, 'monitor' => $monitor]);
            exit;
        }

        // List all monitors
        $stmt = $pdo->query("SELECT * FROM monitors ORDER BY category ASC, name ASC");
        $monitors = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($monitors as &$mon) {
            $hStmt = $pdo->prepare("SELECT day_offset as day, status, latency FROM check_history WHERE monitor_id = ? ORDER BY day_offset ASC");
            $hStmt->execute([$mon['id']]);
            $mon['history'] = $hStmt->fetchAll(PDO::FETCH_ASSOC);
            $mon['latency'] = (int)$mon['latency'];
            $mon['uptime'] = (float)$mon['uptime'];
        }

        echo json_encode(['success' => true, 'monitors' => $monitors]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $action = $input['action'] ?? 'create';

    if ($action === 'delete') {
        $id = $input['id'] ?? '';
        $stmt = $pdo->prepare("DELETE FROM monitors WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'deleted' => $id]);
        exit;
    }

    $id = 'mon-' . time() . '-' . rand(100, 999);
    $name = trim($input['name'] ?? 'New Service');
    $slug = slugify($name);
    $category = trim($input['category'] ?? 'General');
    $type = trim($input['type'] ?? 'website');
    $target = trim($input['target'] ?? 'https://tstatus.de');
    $interval = (int)($input['interval'] ?? 30);

    $stmt = $pdo->prepare("INSERT INTO monitors (id, slug, name, category, type, target, check_interval, status, latency, uptime) VALUES (?, ?, ?, ?, ?, ?, ?, 'operational', 15, 100.0)");
    $stmt->execute([$id, $slug, $name, $category, $type, $target, $interval]);

    // Insert 45-day history mockup
    $hStmt = $pdo->prepare("INSERT INTO check_history (monitor_id, status, latency, day_offset) VALUES (?, 'operational', 15, ?)");
    for ($d = 1; $d <= 45; $d++) {
        $hStmt->execute([$id, $d]);
    }

    echo json_encode(['success' => true, 'id' => $id, 'slug' => $slug]);
}
