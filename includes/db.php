<?php
/**
 * tstatus.de Database Helper & Schema Management (PDO)
 */

require_once __DIR__ . '/../config.php';

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            try {
                if (DB_DRIVER === 'sqlite') {
                    self::$instance = new PDO('sqlite:' . DB_PATH);
                    self::$instance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                    self::$instance->exec("PRAGMA foreign_keys = ON;");
                } else {
                    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
                    self::$instance = new PDO($dsn, DB_USER, DB_PASS, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                    ]);
                }
                self::initSchema(self::$instance);
            } catch (PDOException $e) {
                die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
            }
        }
        return self::$instance;
    }

    private static function initSchema(PDO $pdo): void {
        // Monitors Table
        $sqlMonitors = "CREATE TABLE IF NOT EXISTS monitors (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(255) NOT NULL,
            type VARCHAR(64) NOT NULL,
            target VARCHAR(255) NOT NULL,
            check_interval INT DEFAULT 30,
            status VARCHAR(32) DEFAULT 'operational',
            latency INT DEFAULT 0,
            uptime FLOAT DEFAULT 99.9,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );";

        // Check History Table
        $sqlHistory = "CREATE TABLE IF NOT EXISTS check_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            monitor_id VARCHAR(64) NOT NULL,
            status VARCHAR(32) NOT NULL,
            latency INT DEFAULT 0,
            day_offset INT DEFAULT 0,
            checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
        );";

        // Incidents Table
        $sqlIncidents = "CREATE TABLE IF NOT EXISTS incidents (
            id VARCHAR(64) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            status VARCHAR(64) NOT NULL,
            date_str VARCHAR(64) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );";

        // Incident Updates Table
        $sqlUpdates = "CREATE TABLE IF NOT EXISTS incident_updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            incident_id VARCHAR(64) NOT NULL,
            status VARCHAR(64) NOT NULL,
            message TEXT NOT NULL,
            update_time VARCHAR(64) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
        );";

        $pdo->exec($sqlMonitors);
        $pdo->exec($sqlHistory);
        $pdo->exec($sqlIncidents);
        $pdo->exec($sqlUpdates);

        self::seedInitialData($pdo);
    }

    private static function seedInitialData(PDO $pdo): void {
        $stmt = $pdo->query("SELECT COUNT(*) FROM monitors");
        if ($stmt->fetchColumn() == 0) {
            $monitors = [
                ['mon-101', 'ternis-edv.de Main Portal', 'Ternis Core Services', 'website', 'https://ternis-edv.de', 30, 'operational', 18, 99.98],
                ['mon-102', 'thosted.de (Ternis Hosted)', 'Ternis Core Services', 'website', 'https://thosted.de', 30, 'operational', 22, 99.95],
                ['mon-103', 'tstatic.de (Static Assets CDN)', 'CDN & Asset Network', 'website', 'https://tstatic.de', 15, 'operational', 8, 100.0],
                ['mon-104', 'ternis.net (Backbone & DNS)', 'Infrastructure', 'server', 'ternis.net (DNS/ICMP)', 15, 'operational', 12, 99.99],
                ['mon-105', 'ternis.dev (Developer API)', 'Ternis Core Services', 'website', 'https://ternis.dev', 30, 'operational', 35, 99.91],
                ['mon-106', 'ternismail.de (Mail Server Cluster)', 'Communication Services', 'server', 'mail.ternismail.de:587 (SMTP)', 60, 'operational', 24, 99.97],
                ['mon-107', 'ternis.link (URL Redirection)', 'Ternis Core Services', 'website', 'https://ternis.link', 30, 'operational', 15, 99.99],
                ['mon-108', 'db-01.infra-node.de (MariaDB Cluster)', 'Databases & Storage', 'database', '10.0.8.20:3306 (MariaDB)', 15, 'operational', 3, 99.99],
                ['mon-109', 'redis-01.infra-node.de (Redis Cache)', 'Databases & Storage', 'database', '10.0.8.35:6379 (Redis)', 15, 'operational', 1, 100.0],
                ['mon-110', 'srv-linux-01.infra-node.de (App Server)', 'Linux Servers', 'server', 'srv-linux-01.infra-node.de (Linux/SSH)', 30, 'operational', 14, 99.93],
                ['mon-111', 'cloud-node01.de (Edge Gateway)', 'Linux Servers', 'server', 'cloud-node01.de (ICMP Ping)', 60, 'degraded', 140, 98.60]
            ];

            $insertStmt = $pdo->prepare("INSERT INTO monitors (id, name, category, type, target, check_interval, status, latency, uptime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($monitors as $m) {
                $insertStmt->execute($m);
                self::seedHistory($pdo, $m[0], $m[6]);
            }

            // Seed sample incident
            $pdo->exec("INSERT INTO incidents (id, title, status, date_str) VALUES ('inc-201', 'Scheduled Edge Node Network Optimization', 'monitoring', 'Aug 11, 2026')");
            $pdo->exec("INSERT INTO incidents (id, title, status, date_str) VALUES ('inc-202', 'Routine Database Maintenance on MariaDB Cluster', 'resolved', 'Aug 10, 2026')");
            
            $pdo->exec("INSERT INTO incident_updates (incident_id, status, message, update_time) VALUES ('inc-201', 'monitoring', 'cloud-node01.de latency optimization in progress.', '14:30 CEST')");
            $pdo->exec("INSERT INTO incident_updates (incident_id, status, message, update_time) VALUES ('inc-202', 'resolved', 'MariaDB index rebuild and storage optimization completed cleanly.', '04:00 CEST')");
        }
    }

    private static function seedHistory(PDO $pdo, string $monitorId, string $status): void {
        $stmt = $pdo->prepare("INSERT INTO check_history (monitor_id, status, latency, day_offset) VALUES (?, ?, ?, ?)");
        for ($day = 1; $day <= 45; $day++) {
            $s = ($day === 45) ? $status : ((rand(1, 100) > 97) ? 'degraded' : 'operational');
            $lat = rand(5, 45);
            $stmt->execute([$monitorId, $s, $lat, $day]);
        }
    }
}
