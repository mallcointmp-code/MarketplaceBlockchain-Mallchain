const { exec } = require('child_process');

function triggerBackup() {
  const backupPath = `e:/The_Market_Place 1.0/backups/${new Date().toISOString().replace(/[:.]/g, "_")}`;
  exec(`mongodump --uri="mongodb://localhost:27017/your_db_name" --out="${backupPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error("Backup failed:", error);
    } else {
      console.log("Backup completed:", backupPath);
    }
  });
}

triggerBackup();
module.exports = { backupPath };