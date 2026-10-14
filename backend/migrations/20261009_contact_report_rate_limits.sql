-- Additive anti-spam storage for public contact reports.
-- This migration does not create or alter contact_reports or users.
CREATE TABLE IF NOT EXISTS contact_report_rate_limits (
  ip_hash CHAR(64) NOT NULL,
  window_started_at DATETIME NOT NULL,
  window_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  day_started_at DATE NOT NULL,
  day_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  last_report_at DATETIME NULL,
  PRIMARY KEY (ip_hash),
  KEY idx_contact_report_rate_last_report (last_report_at)
) ENGINE=InnoDB;
