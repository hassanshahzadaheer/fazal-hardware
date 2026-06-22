-- Correct the initial sample user hashes so the documented login credentials work.
UPDATE users
SET password_hash = '$2a$10$209HnogR2FKCY9Wlo7LPG.Cffqnm3.4pfz/rTBAAgs2nouM02uCZ2',
    updated_at = datetime('now')
WHERE username = 'admin';

UPDATE users
SET password_hash = '$2a$10$2DNXgeQCHHbpaHPqwFKwW.zoAHhmC4p5sKeTLHe7KHCMhJDQruiJ2',
    updated_at = datetime('now')
WHERE username = 'cashier';
