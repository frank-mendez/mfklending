-- Store parsed CSV data server-side to prevent client-side tampering of import payloads.
-- The parsed_data column holds the full parsed payload between uploadAndParseCSV and confirmImport.
ALTER TABLE import_logs ADD COLUMN parsed_data jsonb;
