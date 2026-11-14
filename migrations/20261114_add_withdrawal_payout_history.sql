-- Adds gateway settlement and paid-history fields to publisher withdrawals.
ALTER TABLE withdrawal_requests
  MODIFY COLUMN status ENUM('pending','approved','paid','failed','rejected') NOT NULL DEFAULT 'pending',
  ADD COLUMN gateway_status VARCHAR(50) DEFAULT NULL,
  ADD COLUMN paid_at DATETIME DEFAULT NULL,
  ADD COLUMN refunded_at DATETIME DEFAULT NULL;

CREATE TABLE payouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  withdrawal_id INT NOT NULL,
  gateway_id INT DEFAULT NULL,
  rupiyax_trx_id VARCHAR(100) DEFAULT NULL,
  ref_id VARCHAR(100) DEFAULT NULL,
  amount DECIMAL(10,2) NOT NULL,
  fee DECIMAL(10,2) DEFAULT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  utr VARCHAR(100) DEFAULT NULL,
  raw_response JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payouts_withdrawal_created (withdrawal_id, created_at),
  CONSTRAINT fk_payouts_withdrawal FOREIGN KEY (withdrawal_id)
    REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_payouts_gateway FOREIGN KEY (gateway_id)
    REFERENCES payment_gateways(id) ON DELETE SET NULL
);
