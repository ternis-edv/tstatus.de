<?php
/**
 * tstatus.de API v1 - Info Endpoint
 */

declare(strict_types=1);

header('Content-Type: application/json');

echo json_encode([
    'success' => true,
    'data' => [
        'app_name' => APP_NAME,
        'app_title' => APP_TITLE,
        'version' => '1.0.0',
        'api_version' => 'v1',
        'environment' => ENV,
        'db_driver' => DB_DRIVER,
        'commit_hash' => get_git_commit_hash(),
        'github_latest_url' => 'https://go.tstatus.de/gh-latest'
    ]
]);
