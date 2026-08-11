<?php
/**
 * tstatus.de Bootstrap File
 * Initializes environment, error handling, database connection, and helper utilities.
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/db.php';

// Configure Error Reporting
if (defined('ENV') && ENV === 'dev') {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(0);
    ini_set('display_errors', '0');
}

// Global PDO Database instance
$pdo = Database::getConnection();
