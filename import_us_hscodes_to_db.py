import pandas as pd
import sqlite3
import json
import os

# File path
US_FILE = os.path.join('US File', 'hts_2025_basic_edition_xlsx.xlsx')
DB_FILE = 'hscode.db'

# Read Excel file
df = pd.read_excel(US_FILE, dtype={'HTS Number': str})

# Clean up code column (remove .0 if present)
df['HTS Number'] = df['HTS Number'].str.split('.').str[0]

# Connect to SQLite DB
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Get or create US country_id
cursor.execute("SELECT id FROM countries WHERE iso_code = 'US'")
row = cursor.fetchone()
if row:
    us_country_id = row[0]
else:
    cursor.execute("INSERT INTO countries (name, iso_code) VALUES (?, ?)", ("United States", "US"))
    us_country_id = cursor.lastrowid
    conn.commit()

# Insert/update hscodes
for _, row in df.iterrows():
    code = row['HTS Number']
    if not code or pd.isna(code) or str(code).strip() == '':
        continue  # Skip rows with missing code
    description = row.get('Description', None)
    duty = row.get('General Rate of Duty', None)
    # Collect extra info
    extra_info = {
        'indent': row.get('Indent'),
        'unit_of_quantity': row.get('Unit of Quantity'),
        'special_rate_of_duty': row.get('Special Rate of Duty'),
        'column_2_rate_of_duty': row.get('Column 2 Rate of Duty'),
        'quota_quantity': row.get('Quota Quantity'),
        'additional_duties': row.get('Additional Duties')
    }
    # Upsert into hscodes
    cursor.execute('''
        INSERT INTO hscodes (code, description, country_id, duty, extra_info)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(code, country_id) DO UPDATE SET
            description=excluded.description,
            duty=excluded.duty,
            extra_info=excluded.extra_info
    ''', (code, description, us_country_id, duty, json.dumps(extra_info)))

conn.commit()
conn.close()

print("US HS codes and duties imported successfully.")
