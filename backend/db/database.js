const path = require('path');
const fs = require('fs');

// Use a file-backed SQLite via sql.js with fs persistence
let SQL;
let db;
const DB_PATH = path.join(__dirname, 'jobportal.db');

function getDb() {
  if (db) return db;

  // Lazy-load sql.js (synchronous wrapper)
  if (!SQL) {
    // sql.js is async init but we wrap it synchronously via initSqlJs loaded at startup
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

async function initDatabase() {
  const initSqlJs = require('sql.js');
  SQL = await initSqlJs();

  // Load existing DB file if present
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createSchema();
  persistDb(); // initial save
  return db;
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('seeker', 'employer')),
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS job_seeker_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      headline TEXT,
      bio TEXT,
      phone TEXT,
      location TEXT,
      skills TEXT,
      experience TEXT,
      education TEXT,
      resume_url TEXT,
      website TEXT,
      linkedin TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS employer_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      company_name TEXT NOT NULL,
      industry TEXT,
      company_size TEXT,
      description TEXT,
      website TEXT,
      phone TEXT,
      location TEXT,
      logo_url TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employer_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      requirements TEXT,
      location TEXT NOT NULL,
      job_type TEXT NOT NULL CHECK(job_type IN ('full-time','part-time','contract','internship','remote')),
      salary_min INTEGER,
      salary_max INTEGER,
      category TEXT,
      deadline DATE,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','filled','closed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      seeker_id INTEGER NOT NULL,
      cover_letter TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reviewed','shortlisted','rejected','hired')),
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(job_id, seeker_id),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (seeker_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

// Persist the in-memory DB to disk after every write
function persistDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Wrapped query helpers that auto-persist on writes
function run(sql, params = []) {
  db.run(sql, params);
  persistDb();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  const rows = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function lastInsertRowId() {
  const result = get('SELECT last_insert_rowid() as id');
  return result ? result.id : null;
}

module.exports = { initDatabase, run, get, all, lastInsertRowId, persistDb };
