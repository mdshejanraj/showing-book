-- ShowingBook demo data. Safe to run more than once (INSERT OR IGNORE).
-- DEMO ONLY: all three accounts share the demo password  Demo#Pass2026
-- Change or delete these users before using the system with real data.
PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO users (id, email, name, password_hash, role) VALUES
 ('u-admin', 'admin@showingbook.demo', 'Demo Admin', '$2b$11$Kuq1WHFfAx2sZltOVXGq2eENoC1QL2UqDGRgg4Zp9epzmuqDMvqFi', 'admin'),
 ('u-agent', 'agent@showingbook.demo', 'Demo Agent', '$2b$11$Kuq1WHFfAx2sZltOVXGq2eENoC1QL2UqDGRgg4Zp9epzmuqDMvqFi', 'agent'),
 ('u-agent2','agent2@showingbook.demo','Second Agent','$2b$11$Kuq1WHFfAx2sZltOVXGq2eENoC1QL2UqDGRgg4Zp9epzmuqDMvqFi', 'agent');

INSERT OR IGNORE INTO clients (id, owner_id, name, phone, email, stage, budget, notes) VALUES
 ('c1','u-agent','Amara Okafor','555-0142','amara@example.com','Searching','$450k, 3-bed near schools','Pre-approved. Prefers a garden.'),
 ('c2','u-agent','Daniel Reyes','555-0177','','Lead','$300k–350k, condo','Found us through the website form.'),
 ('c3','u-agent','Priya and Sam Nair','555-0119','nairs@example.com','Viewing','$620k, 4-bed','Second viewing before offering.'),
 ('c4','u-agent','Helen Brooks','555-0163','','Offer','$510k cash','Offer submitted on Quay Street.'),
 ('c5','u-agent2','Marcus Webb','555-0101','marcus@example.com','Lead','$280k, 2-bed','Belongs to the second agent: the first agent must never see this.');

INSERT OR IGNORE INTO client_tags (client_id, tag) VALUES
 ('c1','3-bed'),('c1','garden'),('c2','condo'),('c2','first-time buyer'),
 ('c3','4-bed'),('c3','school zone'),('c4','cash buyer'),('c4','waterfront'),('c5','2-bed');

INSERT OR IGNORE INTO listings (id, owner_id, address, price, status) VALUES
 ('l1','u-agent','14 Alder Court','$449,000','Active'),
 ('l2','u-agent','88 Quay Street','$515,000','Under offer'),
 ('l3','u-agent','3 Ferry Lane','$625,000','Active'),
 ('l4','u-agent','Unit 6, Mill Yard','$329,000','Coming soon'),
 ('l5','u-agent','21 Heron Way','$398,000','Sold');

INSERT OR IGNORE INTO viewings (id, owner_id, client_id, property, view_date, view_time, dur_min, status, notes) VALUES
 ('v1','u-agent','c1','14 Alder Court',date('now','localtime'),'10:00',60,'scheduled','Key in lockbox.'),
 ('v2','u-agent','c3','88 Quay Street',date('now','localtime'),'15:30',60,'scheduled',''),
 ('v3','u-agent','c2','Unit 6, Mill Yard',date('now','localtime','+1 day'),'11:00',45,'scheduled','First visit. Confirm by text.'),
 ('v4','u-agent','c4','88 Quay Street',date('now','localtime','+2 day'),'09:30',30,'scheduled','Measure the loft.'),
 ('v5','u-agent','c3','3 Ferry Lane',date('now','localtime','-1 day'),'16:00',60,'done','Liked the kitchen, worried about road noise.');

INSERT OR IGNORE INTO tasks (id, owner_id, client_id, title, due_date, done) VALUES
 ('t1','u-agent','c1','Send mortgage checklist',date('now','localtime'),0),
 ('t2','u-agent','c4','Chase survey results',date('now','localtime','-1 day'),0),
 ('t3','u-agent','c3','Ask for offer decision',date('now','localtime','+2 day'),0),
 ('t4','u-agent','c2','Call after first viewing',date('now','localtime','+1 day'),0);
