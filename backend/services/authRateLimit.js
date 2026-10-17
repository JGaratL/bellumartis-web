const crypto = require("crypto");
const pool = require("../db");

let tableReady;
let nextCleanupAt = 0;

const ensureTable = () => {
  if (!tableReady) {
    tableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS auth_request_rate_limits (
        action VARCHAR(32) NOT NULL,
        key_hash CHAR(64) NOT NULL,
        window_started_at DATETIME NOT NULL,
        request_count INT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (action, key_hash),
        KEY idx_auth_request_rate_limits_window (window_started_at)
      ) ENGINE=InnoDB
    `).catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  return tableReady;
};

const hashKey = (value) => crypto
  .createHmac("sha256", process.env.JWT_SECRET)
  .update(String(value || "unknown"))
  .digest("hex");

async function reserveAuthRequest({ action, email, req, emailLimit, ipLimit, windowSeconds }) {
  if (!Number.isSafeInteger(windowSeconds) || windowSeconds < 1) {
    throw new TypeError("Invalid auth rate limit window");
  }
  await ensureTable();

  if (Date.now() >= nextCleanupAt) {
    nextCleanupAt = Date.now() + 60 * 60 * 1000;
    pool.query("DELETE FROM auth_request_rate_limits WHERE window_started_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)")
      .catch((error) => console.error("AUTH RATE LIMIT CLEANUP ERROR:", error.message));
  }

  const ip = req.socket?.remoteAddress || "unknown";
  const buckets = [
    { key: `email:${String(email || "").trim().toLowerCase()}`, limit: emailLimit },
    { key: `ip:${ip}`, limit: ipLimit },
  ];
  let allowed = true;
  let retryAfterSeconds = 0;

  for (const bucket of buckets) {
    const keyHash = hashKey(bucket.key);
    await pool.query(
      `INSERT INTO auth_request_rate_limits (action, key_hash, window_started_at, request_count)
       VALUES (?, ?, UTC_TIMESTAMP(), 1)
       ON DUPLICATE KEY UPDATE
         request_count = IF(window_started_at <= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND), 1, request_count + 1),
         window_started_at = IF(window_started_at <= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND), UTC_TIMESTAMP(), window_started_at)`,
      [action, keyHash, windowSeconds, windowSeconds]
    );

    const [[row]] = await pool.query(
      `SELECT request_count,
              GREATEST(1, ? - TIMESTAMPDIFF(SECOND, window_started_at, UTC_TIMESTAMP())) AS retry_after
       FROM auth_request_rate_limits WHERE action = ? AND key_hash = ?`,
      [windowSeconds, action, keyHash]
    );
    if (Number(row?.request_count || 0) > bucket.limit) {
      allowed = false;
      retryAfterSeconds = Math.max(retryAfterSeconds, Number(row.retry_after) || windowSeconds);
    }
  }

  return { allowed, retryAfterSeconds };
}

module.exports = { reserveAuthRequest };
