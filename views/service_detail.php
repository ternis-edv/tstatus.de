<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($monitor['name']) ?> Status | tstatus.de</title>
  <meta name="description" content="Detailed real-time uptime, response latency, and status history for <?= htmlspecialchars($monitor['name']) ?> at tstatus.de.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>

  <header>
    <div class="container nav-content">
      <div class="brand-section">
        <a href="/" style="text-decoration:none; display:flex; align-items:center; gap:0.875rem;">
          <div class="brand-logo">T</div>
          <div class="brand-title-wrap">
            <h1 style="color:#fff;">tstatus.de</h1>
            <p>Ternis Statuspage &bull; Dedicated Service View</p>
          </div>
        </a>
      </div>
      <div class="header-actions">
        <a href="/" class="btn btn-sm">
          &larr; Back to Main Overview
        </a>
      </div>
    </div>
  </header>

  <div class="container">
    
    <!-- Service Header Card -->
    <div class="card" style="margin-bottom: 2rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 2rem;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem;">
        <div>
          <span style="font-size:0.8125rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--accent-primary); font-weight:600;">
            <?= htmlspecialchars($monitor['category']) ?>
          </span>
          <h1 style="font-size: 2rem; font-weight:700; margin:0.25rem 0 0.5rem 0; color:#fff;">
            <?= htmlspecialchars($monitor['name']) ?>
          </h1>
          <p style="font-family:monospace; color:var(--text-muted); font-size:0.9375rem;">
            Target: <?= htmlspecialchars($monitor['target']) ?>
          </p>
        </div>
        <div>
          <span class="status-badge <?= htmlspecialchars($monitor['status']) ?>" style="font-size: 1rem; padding: 0.5rem 1.25rem;">
            &bull; <?= strtoupper(htmlspecialchars($monitor['status'])) ?>
          </span>
        </div>
      </div>
    </div>

    <!-- Service Metrics Grid -->
    <div class="metrics-grid" style="margin-bottom: 2.5rem;">
      <div class="metric-card">
        <div class="label">Average Latency</div>
        <div class="value"><?= (int)$monitor['latency'] ?> ms</div>
      </div>
      <div class="metric-card">
        <div class="label">30-Day Uptime</div>
        <div class="value" style="color:var(--status-operational);"><?= number_format((float)$monitor['uptime'], 2) ?>%</div>
      </div>
      <div class="metric-card">
        <div class="label">Check Frequency</div>
        <div class="value">Every <?= (int)$monitor['check_interval'] ?>s</div>
      </div>
      <div class="metric-card">
        <div class="label">Service Slug</div>
        <div class="value" style="font-size: 1.125rem; font-family:monospace; color:var(--text-sub);">/s/<?= htmlspecialchars($monitor['slug']) ?></div>
      </div>
    </div>

    <!-- 45-Day Detailed Timeline Card -->
    <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 3rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
        <h3 style="font-size: 1.25rem; font-weight:700;">45-Day Performance History</h3>
        <span style="font-size: 0.875rem; color:var(--text-muted);">Updated in real-time</span>
      </div>

      <div class="timeline-bars" style="height: 48px; gap: 4px;">
        <?php foreach ($history as $h): ?>
          <div class="bar-item <?= htmlspecialchars($h['status']) ?>" data-tooltip="Day <?= $h['day'] ?>: <?= strtoupper($h['status']) ?> (<?= $h['latency'] ?>ms)"></div>
        <?php endforeach; ?>
      </div>

      <div style="display:flex; justify-content:space-between; margin-top: 1rem; font-size: 0.8125rem; color: var(--text-muted);">
        <span>45 Days Ago</span>
        <span>Today</span>
      </div>
    </div>

    <footer>
      <p>&copy; 2026 Ternis EDV &bull; <a href="/">tstatus.de</a> &bull; Dedicated Service Monitoring for <?= htmlspecialchars($monitor['name']) ?></p>
    </footer>

  </div>

</body>
</html>
