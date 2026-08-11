<?php
/**
 * tstatus.de App Info API Endpoint
 */

declare(strict_types=1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../bootstrap.php';

echo json_encode([
    'success' => true,
    'app_name' => APP_NAME,
    'app_title' => APP_TITLE,
    'environment' => ENV,
    'commit_hash' => get_git_commit_hash(),
    'github_latest_url' => 'https://go.tstatus.de/gh-latest'
]);
