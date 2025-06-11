import subprocess
import re
import sqlite3
import json
import os

PDF_FILE = os.path.join('UAE Files', 'HScode-2022-v0.1.pdf')
DB_FILE = 'hscode.db'

# Extract text from PDF using pdftotext
text = subprocess.check_output(['pdftotext', PDF_FILE, '-'], encoding='utf-8')

# Regex to match HS code, description, and duty rate
# Example: 03027100  - Tilapias (Oreochromis spp.) ... 0%
pattern = re.compile(r'(?P<code>\d{2}\s?\d{2}\s?\d{2}\s?\d{2})\s+[-–—]?\s*(?P<desc>.+?)\s+(?P<duty>\d+%)', re.MULTILINE)

matches = pattern.findall(text)

# Connect to SQLite DB
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Get or create UAE country_id
cursor.execute("SELECT id FROM countries WHERE iso_code = 'AE'")
row = cursor.fetchone()
if row:
    uae_country_id = row[0]
else:
    cursor.execute("INSERT INTO countries (name, iso_code) VALUES (?, ?)", ("United Arab Emirates", "AE"))
    uae_country_id = cursor.lastrowid
    conn.commit()

# Insert/update hscodes
for code, desc, duty in matches:
    code_clean = code.replace(' ', '')
    description = desc.strip()
    duty_rate = duty.strip()
    extra_info = {}
    cursor.execute('''
        INSERT INTO hscodes (code, description, country_id, duty, extra_info)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(code, country_id) DO UPDATE SET
            description=excluded.description,
            duty=excluded.duty,
            extra_info=excluded.extra_info
    ''', (code_clean, description, uae_country_id, duty_rate, json.dumps(extra_info)))

conn.commit()
conn.close()

print("UAE HS codes and duties imported successfully.")
