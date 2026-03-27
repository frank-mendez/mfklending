-- Make phone nullable on partners and borrowers
-- Partners are seeded without phone numbers; borrowers may not always have one.
ALTER TABLE partners  ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE borrowers ALTER COLUMN phone DROP NOT NULL;
