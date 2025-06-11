import json
import sqlite3

with open('global_product_map.json') as f:
    products = json.load(f)

print("--- Example 1: All products/categories containing 'drone' ---")
drone_results = [v for v in products.values() if 'drone' in v['keywords']]
for prod in drone_results[:5]:  # Show up to 5 examples
    print(f"Name: {prod['name']}\nType: {prod['type']}\nHS Codes: {prod['hs_codes']}\n")

print("--- Example 2: All info for HS code 88021100 ---")
code = '88021100'
prod = products.get(code)
if prod:
    print(f"Name: {prod['name']}\nType: {prod['type']}\nHS Codes: {prod['hs_codes']}")
    for iso in prod['hs_codes']:
        conn = sqlite3.connect('hscode.db')
        cursor = conn.cursor()
        cursor.execute(
            "SELECT description, duty, extra_info FROM hscodes WHERE code = ? AND country_id = (SELECT id FROM countries WHERE iso_code = ?)",
            (code, iso)
        )
        row = cursor.fetchone()
        print(f"{iso}: {row}")
        conn.close()
else:
    print("HS code 88021100 not found in product map.")

print("--- Example 3: All products in the 'radio' category ---")
radio_results = [v for v in products.values() if v['type'] == 'radio']
for prod in radio_results[:5]:  # Show up to 5 examples
    print(f"Name: {prod['name']}\nHS Codes: {prod['hs_codes']}\n")
