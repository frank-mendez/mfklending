-- Make optional borrower fields nullable.
-- Only full_name, email, and created_at are required.
-- CSV imports and manually created borrowers may lack age, occupation,
-- bank details, or phone, so these must accept NULL.
ALTER TABLE borrowers
  ALTER COLUMN age          DROP NOT NULL,
  ALTER COLUMN occupation   DROP NOT NULL,
  ALTER COLUMN phone        DROP NOT NULL,
  ALTER COLUMN bank_name    DROP NOT NULL,
  ALTER COLUMN account_name DROP NOT NULL,
  ALTER COLUMN account_number DROP NOT NULL;
