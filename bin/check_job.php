#!/usr/bin/env php
<?php
/**
 * tstatus.de CLI Health Check Job Runner
 * Execute via cron or scheduler: `php bin/check_job.php`
 */

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

use Tstatus\Job\CheckJob;

$options = getopt('', ['target:', 'json', 'help']);

if (isset($options['help'])) {
    echo "tstatus.de Automated Status Check Job\n";
    echo "Usage:\n";
    echo "  php bin/check_job.php                Run check on all monitors\n";
    echo "  php bin/check_job.php --target=mon-101 Run check on a specific monitor ID/slug\n";
    echo "  php bin/check_job.php --json         Output formatted JSON response\n";
    exit(0);
}

$target = $options['target'] ?? null;
$isJson = isset($options['json']);

$res = CheckJob::run($target);

if ($isJson) {
    echo json_encode($res, JSON_PRETTY_PRINT) . PHP_EOL;
    exit(0);
}

// Pretty CLI Console Formatting
echo "\n=======================================================\n";
echo "           tstatus.de HEALTH CHECK JOB                 \n";
echo "=======================================================\n";
echo "Timestamp:    " . $res['timestamp'] . "\n";
echo "Execution:    " . $res['execution_time_ms'] . " ms\n";
echo "Total Target: " . $res['checked_count'] . "\n";
echo "Operational:  " . $res['summary']['operational'] . "\n";
echo "Degraded:     " . $res['summary']['degraded'] . "\n";
echo "Outages:      " . $res['summary']['outage'] . "\n";
echo "Auto-Incidents: " . $res['summary']['auto_incidents'] . "\n";
echo "-------------------------------------------------------\n";

foreach ($res['results'] as $item) {
    $statusColor = match ($item['status']) {
        'operational' => "\033[32m[OPERATIONAL]\033[0m",
        'degraded'    => "\033[33m[ DEGRADED  ]\033[0m",
        'outage'      => "\033[31m[   OUTAGE  ]\033[0m",
        default       => "[  UNKNOWN  ]"
    };

    printf(
        "%s %-32s (%d ms | SLA: %.2f%%)\n",
        $statusColor,
        substr($item['name'], 0, 32),
        $item['latency_ms'],
        $item['uptime_percent']
    );
}

echo "=======================================================\n\n";
