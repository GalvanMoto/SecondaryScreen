import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'adbstudio.db');
const db = new Database(dbPath);

// Enable Write-Ahead Logging (WAL) for sub-millisecond concurrent writes & reads
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS telemetry_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serial TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    battery_level INTEGER,
    battery_temp REAL,
    battery_voltage INTEGER,
    is_charging INTEGER,
    ram_used_mb INTEGER,
    ram_total_mb INTEGER,
    ram_percent INTEGER,
    storage_used_gb TEXT,
    storage_total_gb TEXT,
    storage_percent INTEGER,
    adb_latency_ms REAL,
    db_latency_ms REAL
  );

  CREATE TABLE IF NOT EXISTS action_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serial TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    action TEXT NOT NULL,
    payload TEXT,
    adb_latency_ms REAL,
    db_latency_ms REAL,
    status TEXT NOT NULL,
    message TEXT
  );

  CREATE TABLE IF NOT EXISTS shell_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serial TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    command TEXT NOT NULL,
    output TEXT,
    duration_ms REAL
  );

  CREATE TABLE IF NOT EXISTS device_metadata (
    serial TEXT PRIMARY KEY,
    model TEXT,
    manufacturer TEXT,
    android_version TEXT,
    sdk_version TEXT,
    screen_resolution TEXT,
    ip_address TEXT,
    last_seen INTEGER
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serial TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tool_called TEXT,
    tool_args TEXT,
    tool_result TEXT,
    latency_ms REAL
  );

  CREATE INDEX IF NOT EXISTS idx_telemetry_serial_time ON telemetry_logs (serial, timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_action_serial_time ON action_logs (serial, timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_chat_serial_time ON chat_messages (serial, timestamp ASC);
`);

// Prepared Statements for ultra-low latency execution
const insertTelemetryStmt = db.prepare(`
  INSERT INTO telemetry_logs (
    serial, timestamp, battery_level, battery_temp, battery_voltage,
    is_charging, ram_used_mb, ram_total_mb, ram_percent,
    storage_used_gb, storage_total_gb, storage_percent,
    adb_latency_ms, db_latency_ms
  ) VALUES (
    @serial, @timestamp, @battery_level, @battery_temp, @battery_voltage,
    @is_charging, @ram_used_mb, @ram_total_mb, @ram_percent,
    @storage_used_gb, @storage_total_gb, @storage_percent,
    @adb_latency_ms, @db_latency_ms
  )
`);

const insertActionStmt = db.prepare(`
  INSERT INTO action_logs (
    serial, timestamp, action, payload, adb_latency_ms, db_latency_ms, status, message
  ) VALUES (
    @serial, @timestamp, @action, @payload, @adb_latency_ms, @db_latency_ms, @status, @message
  )
`);

const insertShellStmt = db.prepare(`
  INSERT INTO shell_history (
    serial, timestamp, command, output, duration_ms
  ) VALUES (
    @serial, @timestamp, @command, @output, @duration_ms
  )
`);

const upsertDeviceStmt = db.prepare(`
  INSERT INTO device_metadata (
    serial, model, manufacturer, android_version, sdk_version, screen_resolution, ip_address, last_seen
  ) VALUES (
    @serial, @model, @manufacturer, @android_version, @sdk_version, @screen_resolution, @ip_address, @last_seen
  )
  ON CONFLICT(serial) DO UPDATE SET
    model=excluded.model,
    manufacturer=excluded.manufacturer,
    android_version=excluded.android_version,
    sdk_version=excluded.sdk_version,
    screen_resolution=excluded.screen_resolution,
    ip_address=excluded.ip_address,
    last_seen=excluded.last_seen
`);

export function logTelemetry(sample: {
  serial: string;
  battery_level: number;
  battery_temp: number;
  battery_voltage: number;
  is_charging: boolean;
  ram_used_mb: number;
  ram_total_mb: number;
  ram_percent: number;
  storage_used_gb: string;
  storage_total_gb: string;
  storage_percent: number;
  adb_latency_ms: number;
}): { db_latency_ms: number } {
  const t0 = performance.now();
  insertTelemetryStmt.run({
    serial: sample.serial,
    timestamp: Date.now(),
    battery_level: sample.battery_level,
    battery_temp: sample.battery_temp,
    battery_voltage: sample.battery_voltage,
    is_charging: sample.is_charging ? 1 : 0,
    ram_used_mb: sample.ram_used_mb,
    ram_total_mb: sample.ram_total_mb,
    ram_percent: sample.ram_percent,
    storage_used_gb: sample.storage_used_gb,
    storage_total_gb: sample.storage_total_gb,
    storage_percent: sample.storage_percent,
    adb_latency_ms: Math.round(sample.adb_latency_ms * 10) / 10,
    db_latency_ms: 0,
  });
  const db_latency_ms = Math.round((performance.now() - t0) * 100) / 100;
  return { db_latency_ms };
}

export function logAction(entry: {
  serial: string;
  action: string;
  payload?: any;
  adb_latency_ms: number;
  status: 'success' | 'error';
  message?: string;
}): { db_latency_ms: number } {
  const t0 = performance.now();
  insertActionStmt.run({
    serial: entry.serial,
    timestamp: Date.now(),
    action: entry.action,
    payload: entry.payload ? JSON.stringify(entry.payload) : null,
    adb_latency_ms: Math.round(entry.adb_latency_ms * 10) / 10,
    db_latency_ms: 0,
    status: entry.status,
    message: entry.message || '',
  });
  const db_latency_ms = Math.round((performance.now() - t0) * 100) / 100;
  return { db_latency_ms };
}

export function logShellCommand(entry: {
  serial: string;
  command: string;
  output: string;
  duration_ms: number;
}) {
  insertShellStmt.run({
    serial: entry.serial,
    timestamp: Date.now(),
    command: entry.command,
    output: entry.output,
    duration_ms: Math.round(entry.duration_ms * 10) / 10,
  });
}

export function upsertDevice(meta: {
  serial: string;
  model: string;
  manufacturer: string;
  android_version: string;
  sdk_version: string;
  screen_resolution: string;
  ip_address: string;
}) {
  upsertDeviceStmt.run({
    ...meta,
    last_seen: Date.now(),
  });
}

export function getRecentActions(serial?: string, limit: number = 30) {
  if (serial) {
    return db.prepare('SELECT * FROM action_logs WHERE serial = ? ORDER BY timestamp DESC LIMIT ?').all(serial, limit);
  }
  return db.prepare('SELECT * FROM action_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
}

export function getTelemetryHistory(serial?: string, limit: number = 40) {
  if (serial) {
    return db.prepare('SELECT * FROM telemetry_logs WHERE serial = ? ORDER BY timestamp DESC LIMIT ?').all(serial, limit);
  }
  return db.prepare('SELECT * FROM telemetry_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
}

export function getRecentShellHistory(serial?: string, limit: number = 20) {
  if (serial) {
    return db.prepare('SELECT * FROM shell_history WHERE serial = ? ORDER BY timestamp DESC LIMIT ?').all(serial, limit);
  }
  return db.prepare('SELECT * FROM shell_history ORDER BY timestamp DESC LIMIT ?').all(limit);
}

export function clearLogs() {
  db.exec('DELETE FROM action_logs; DELETE FROM telemetry_logs; DELETE FROM shell_history;');
}

const insertChatStmt = db.prepare(`
  INSERT INTO chat_messages (
    serial, timestamp, role, content, tool_called, tool_args, tool_result, latency_ms
  ) VALUES (
    @serial, @timestamp, @role, @content, @tool_called, @tool_args, @tool_result, @latency_ms
  )
`);

export function saveChatMessage(entry: {
  serial: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_called?: string;
  tool_args?: any;
  tool_result?: string;
  latency_ms?: number;
}) {
  return insertChatStmt.run({
    serial: entry.serial,
    timestamp: Date.now(),
    role: entry.role,
    content: entry.content,
    tool_called: entry.tool_called || null,
    tool_args: entry.tool_args ? JSON.stringify(entry.tool_args) : null,
    tool_result: entry.tool_result || null,
    latency_ms: entry.latency_ms ? Math.round(entry.latency_ms * 10) / 10 : 0,
  });
}

export function getChatHistory(serial?: string, limit: number = 50) {
  if (serial) {
    return db.prepare('SELECT * FROM chat_messages WHERE serial = ? ORDER BY timestamp ASC LIMIT ?').all(serial, limit);
  }
  return db.prepare('SELECT * FROM chat_messages ORDER BY timestamp ASC LIMIT ?').all(limit);
}

export function clearChatHistory(serial?: string) {
  if (serial) {
    db.prepare('DELETE FROM chat_messages WHERE serial = ?').run(serial);
  } else {
    db.exec('DELETE FROM chat_messages;');
  }
}
