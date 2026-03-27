# Seed Data

Place CSV exports from the MFK Google Sheet here before running the seed script.

Required files:
- lending.csv       (Lending tab — loan history)
- summary.csv       (Summary tab — gains and distributions)
- aha-diminishing.csv  (AHA-Diminishing tab)
- vz-diminishing.csv   (VZ-Diminishing tab)

The stash and dividend data is hardcoded in the seed scripts and does not need a CSV.

Export instructions:
1. Open the MFK Google Sheet
2. Click the tab you want to export
3. File → Download → Comma Separated Values (.csv)
4. Rename the file to match the names above
5. Place it in this directory
