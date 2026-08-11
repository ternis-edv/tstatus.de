<?php
/**
 * tstatus.de Configuration File
 * Environment: 'dev' (SQLite) | 'prod' (MariaDB / MySQL)
 */

define('ENV', getenv('APP_ENV') ?: 'dev');

// Database Configuration
if (ENV === 'prod') {
    define('DB_DRIVER', getenv('DB_DRIVER') ?: 'mysql');
    define('DB_HOST',   getenv('DB_HOST')   ?: '127.0.0.1');
    define('DB_PORT',   getenv('DB_PORT')   ?: '3306');
    define('DB_NAME',   getenv('DB_NAME')   ?: 'tstatus');
    define('DB_USER',   getenv('DB_USER')   ?: 'tstatus_user');
    define('DB_PASS',   getenv('DB_PASS')   ?: 'secret_password');
} else {
    // Development Environment: SQLite
    define('DB_DRIVER', 'sqlite');
    define('DB_PATH',   __DIR__ . '/database.sqlite');
}

// App Settings
define('APP_NAME', 'tstatus.de');
define('APP_TITLE', 'Ternis Statuspage');
