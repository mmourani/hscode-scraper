import json
import sqlite3

DB_FILE = 'hscode.db'
PRODUCTS_FILE = 'brand_products.json'

with open(PRODUCTS_FILE, 'r') as f:
    brands = json.load(f)

conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Map country names to ISO codes in DB
country_map = {
    'germany': 'EU',
    'uae': 'AE',
    'us': 'US',
    'eu': 'EU',
    'cn': 'CN',
    'china': 'CN'
}

for brand, brand_info in brands.items():
    for product in brand_info.get('products', []):
        name = product.get('name')
        ptype = product.get('type')
        hs_codes = product.get('hs_codes', {})
        for country, code in hs_codes.items():
            iso = country_map.get(country.lower())
            if not iso or not code:
                continue
            # Check if code exists for this country
            cursor.execute("SELECT id FROM countries WHERE iso_code = ?", (iso,))
            row = cursor.fetchone()
            if not row:
                continue
            country_id = row[0]
            cursor.execute("SELECT id FROM hscodes WHERE code = ? AND country_id = ?", (code, country_id))
            exists = cursor.fetchone()
            if not exists:
                # Insert with product name/type as description, duty as NULL
                cursor.execute(
                    "INSERT INTO hscodes (code, description, country_id, duty, extra_info) VALUES (?, ?, ?, ?, ?)",
                    (code, f"{brand.title()} {name} ({ptype})", country_id, None, json.dumps({"source": "product map sync"}))
                )

conn.commit()
conn.close()

print("Product map sync to database complete.")
