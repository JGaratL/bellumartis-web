-- Persistent, quota-aware queue and sent-mail archive for admin emails.
-- Apply through the backend migration runner; every operation is idempotent.
ALTER TABLE scheduled_emails
  MODIFY COLUMN status ENUM('scheduled', 'queued', 'sending', 'sent', 'failed', 'cancelled')
  NOT NULL DEFAULT 'scheduled';

ALTER TABLE scheduled_emails
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(36) NULL AFTER error_message;

CREATE TABLE IF NOT EXISTS email_send_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  provider ENUM('brevo', 'foundermail') NOT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  outcome ENUM('accepted', 'failed') NOT NULL,
  operation_id VARCHAR(255) NULL,
  email_type VARCHAR(40) NOT NULL DEFAULT 'administrative',
  recipient_count INT UNSIGNED NOT NULL DEFAULT 1,
  UNIQUE KEY uq_email_send_provider_operation (provider, operation_id),
  KEY idx_email_send_provider_date (provider, outcome, sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE email_send_log
  ADD COLUMN IF NOT EXISTS recipient_count INT UNSIGNED NOT NULL DEFAULT 1 AFTER email_type;

CREATE TABLE IF NOT EXISTS sent_email_archive (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  source_job_id BIGINT UNSIGNED NULL,
  provider ENUM('brevo', 'foundermail') NOT NULL,
  provider_message_id VARCHAR(255) NULL,
  idempotency_key VARCHAR(36) NULL,
  recipients_json JSON NOT NULL,
  subject VARCHAR(998) NOT NULL,
  html_content LONGTEXT NOT NULL,
  text_content LONGTEXT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sent_email_archive_idempotency (idempotency_key),
  KEY idx_sent_email_archive_sent_at (sent_at),
  KEY idx_sent_email_archive_job (source_job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
