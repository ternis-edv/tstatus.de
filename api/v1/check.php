<?php
/**
 * tstatus.de API v1 - Health Check Engine Endpoint
 * Delegates to Tstatus\Job\CheckJob
 */

declare(strict_types=1);

header('Content-Type: application/json');

use Tstatus\Job\CheckJob;

try {
    $target = $_GET['target'] ?? $_GET['id'] ?? null;
    $result = CheckJob::run($target);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
