<?php
/**
 * tstatus.de Incidents REST API Endpoint
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../includes/db.php';
$pdo = Database::getConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM incidents ORDER BY created_at DESC");
        $incidents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($incidents as &$inc) {
            $uStmt = $pdo->prepare("SELECT status, message, update_time as time FROM incident_updates WHERE incident_id = ? ORDER BY created_at DESC");
            $uStmt->execute([$inc['id']]);
            $inc['updates'] = $uStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode(['success' => true, 'incidents' => $incidents]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $id = 'inc-' . time() . '-' . rand(100, 999);
    $title = trim($input['title'] ?? 'System Notice');
    $status = trim($input['status'] ?? 'investigating');
    $message = trim($input['message'] ?? 'Incident reported.');
    $dateStr = date('M j, Y');
    $updateTime = date('H:i') . ' CEST';

    $stmt = $pdo->prepare("INSERT INTO incidents (id, title, status, date_str) VALUES (?, ?, ?, ?)");
    $stmt->execute([$id, $title, $status, $dateStr]);

    $uStmt = $pdo->prepare("INSERT INTO incident_updates (incident_id, status, message, update_time) VALUES (?, ?, ?, ?)");
    $uStmt->execute([$id, $status, $message, $updateTime]);

    echo json_encode(['success' => true, 'id' => $id]);
}
