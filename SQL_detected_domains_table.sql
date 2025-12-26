-- SQL to create detected_domains table
-- Run this manually on your MySQL database

CREATE TABLE IF NOT EXISTS detected_domains (
  id INT AUTO_INCREMENT PRIMARY KEY,
  domain VARCHAR(255) NOT NULL UNIQUE COMMENT 'Normalized domain (lowercase, no www, no protocol)',
  first_detected_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'First time tracking was attempted on this domain',
  last_detected_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Most recent tracking attempt',
  detection_count INT DEFAULT 1 COMMENT 'Number of tracking attempts detected',
  sample_page_url TEXT COMMENT 'Example page URL where detection occurred',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_domain (domain),
  INDEX idx_last_detected_at (last_detected_at),
  INDEX idx_detection_count (detection_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

