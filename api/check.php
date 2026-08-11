<?php
/**
 * tstatus.de Legacy API Check Endpoint
 * Delegates to Tstatus\Job\CheckJob
 */

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

use Tstatus\Job\CheckJob;

try {
    $target = $_GET['target'] ?? $_GET['id'] ?? null;
    $result = CheckJob::run($target);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
