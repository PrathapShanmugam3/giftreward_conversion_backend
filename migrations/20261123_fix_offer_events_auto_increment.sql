-- Sequelize bulk inserts rely on the database generating offer event IDs.
ALTER TABLE offer_events
  MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
