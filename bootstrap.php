<?php
/**
 * tstatus.de Bootstrap File
 * PSR-4 Autoloader, Environment Setup, and Core Dependencies
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/functions.php';

// PSR-4 Autoloader for Tstatus namespace
spl_autoload_register(function (string $class): void {
    $prefix = 'Tstatus\\';
    $baseDir = __DIR__ . '/src/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require_once $file;
    }
});

// Configure Error Handling
if (defined('ENV') && ENV === 'dev') {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(0);
    ini_set('display_errors', '0');
}

// Initialize Database connection
$pdo = \Tstatus\Database::getConnection();
