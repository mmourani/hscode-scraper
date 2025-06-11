import sqlite3
import json
import re

DB_FILE = 'hscode.db'
OUTPUT_FILE = 'global_product_map.json'

conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Get all unique HS codes and descriptions for each country
cursor.execute("""
    SELECT c.iso_code, h.code, h.description
    FROM hscodes h
    JOIN countries c ON h.country_id = c.id
    WHERE h.description IS NOT NULL AND h.description != ''
""")

products = {}
for iso_code, code, desc in cursor.fetchall():
    # Use the first word(s) as a rough type (e.g., 'drone', 'radio', 'camera', etc.)
    type_guess = re.split(r'\W+', desc.lower())[0] if desc else 'product'
    # Use keywords from the description
    keywords = [w for w in re.split(r'\W+', desc.lower()) if w and len(w) > 2]
    # Use code as the unique key
    if code not in products:
        products[code] = {
            'name': desc,
            'type': type_guess,
            'keywords': keywords,
            'hs_codes': {}
        }
    products[code]['hs_codes'][iso_code] = code

conn.close()

# Write to JSON
with open(OUTPUT_FILE, 'w') as f:
    json.dump(products, f, indent=2)

print(f"Global product map generated with {len(products)} unique HS codes.")
