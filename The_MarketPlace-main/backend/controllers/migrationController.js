const path = require('path');
const fs = require('fs');

const LOG_FILE = path.resolve(process.cwd(), 'backend', 'migrations', 'polyline_migration_log.csv');

exports.downloadMigrationLog = async (req, res) => {
  try {
    if (!fs.existsSync(LOG_FILE)) return res.status(404).json({ error: 'Log file not found' });
    res.download(LOG_FILE, 'polyline_migration_log.csv');
  } catch (err) {
    console.error('downloadMigrationLog err', err);
    res.status(500).json({ error: 'failed to download log' });
  }
};
