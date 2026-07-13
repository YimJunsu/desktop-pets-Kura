const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');

const { app } = require('electron');

// Resolve the local SQLite file storage path in standard app data directory (AppData/Roaming)
const appDataDir = app.getPath('userData');
const dbPath = path.join(appDataDir, 'settings.db');

// Ensure appDataDir exists
if (!fs.existsSync(appDataDir)) {
  fs.mkdirSync(appDataDir, { recursive: true });
}

let db = null;

function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Failed to open SQLite database:', err.message);
        return reject(err);
      }
      
      // Create settings table
      db.run(
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )`,
        (tableErr) => {
          if (tableErr) {
            console.error('Failed to create settings table:', tableErr.message);
            return reject(tableErr);
          }
          
          // Seed default settings if empty
          seedDefaults()
            .then(() => resolve(dbPath))
            .catch(reject);
        }
      );
    });
  });
}

const DEFAULT_SETTINGS = {
  size: 'M',
  followMode: 'false',
  sleepMode: 'false',
  typingReaction: 'true',
  autoStart: 'true',
  position: 'null',
  geminiApiKey: '',
  model: 'clawd'
};

function seedDefaults() {
  return new Promise((resolve, reject) => {
    const checkStmt = db.prepare('SELECT count(*) as count FROM settings');
    checkStmt.get((err, row) => {
      if (err) return reject(err);
      
      if (row.count === 0) {
        console.log('Seeding default settings into SQLite...');
        const insertStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
        db.serialize(() => {
          Object.entries(DEFAULT_SETTINGS).forEach(([key, val]) => {
            insertStmt.run(key, val);
          });
          insertStmt.finalize();
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

function getSettings() {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not initialized'));
    
    db.all('SELECT key, value FROM settings', (err, rows) => {
      if (err) return reject(err);
      
      const settingsObj = {};
      rows.forEach(row => {
        // Parse booleans and objects
        let val = row.value;
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (val === 'null') val = null;
        else {
          try {
            // Attempt to parse JSON (e.g. position coordinates)
            if (val.startsWith('{') && val.endsWith('}')) {
              val = JSON.parse(val);
            }
          } catch (e) {
            // Leave as string
          }
        }
        settingsObj[row.key] = val;
      });
      resolve(settingsObj);
    });
  });
}

function updateSetting(key, value) {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not initialized'));
    
    let dbValue = String(value);
    if (typeof value === 'object' && value !== null) {
      dbValue = JSON.stringify(value);
    }
    
    db.run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, dbValue],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

module.exports = {
  initDatabase,
  getSettings,
  updateSetting,
  dbPath
};
