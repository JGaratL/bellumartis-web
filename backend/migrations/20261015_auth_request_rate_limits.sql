CREATE TABLE IF NOT EXISTS auth_request_rate_limits (
  action VARCHAR(32) NOT NULL,
  key_hash CHAR(64) NOT NULL,
  window_started_at DATETIME NOT NULL,
  request_count INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (action, key_hash),
  KEY idx_auth_request_rate_limits_window (window_started_at)
) ENGINE=InnoDB;
