-- Review and pay offer-user/referrer cashback through RupiyaX after conversion approval.
CREATE TABLE campaign_cashback_payouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversion_id INT NOT NULL,
  recipient_type ENUM('user','referrer') NOT NULL,
  recipient_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  ifsc VARCHAR(11) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending','processing','paid','failed') NOT NULL DEFAULT 'pending',
  gateway_id INT DEFAULT NULL,
  gateway_status VARCHAR(50) DEFAULT NULL,
  ref_id VARCHAR(100) DEFAULT NULL,
  rupiyax_trx_id VARCHAR(100) DEFAULT NULL,
  utr VARCHAR(100) DEFAULT NULL,
  paid_at DATETIME DEFAULT NULL,
  raw_response JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_campaign_payout_conversion_recipient (conversion_id, recipient_type),
  INDEX idx_campaign_payout_status_created (status, created_at),
  CONSTRAINT fk_campaign_cashback_conversion FOREIGN KEY (conversion_id)
    REFERENCES conversions(id) ON DELETE CASCADE,
  CONSTRAINT fk_campaign_cashback_gateway FOREIGN KEY (gateway_id)
    REFERENCES payment_gateways(id) ON DELETE SET NULL
);
