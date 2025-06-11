import json
import sqlite3

# Load product mapping
def load_products():
    with open('brand_products.json', 'r') as f:
        data = json.load(f)
    return data.get('quantum systems', {}).get('products', [])

def get_uae_info(hscode):
    conn = sqlite3.connect('hscode.db')
    cursor = conn.cursor()
    cursor.execute("""
        SELECT code, description, duty, extra_info FROM hscodes
        WHERE code = ? AND country_id = (SELECT id FROM countries WHERE iso_code = 'AE')
    """, (hscode,))
    row = cursor.fetchone()
    conn.close()
    if row:
        code, desc, duty, extra_info = row
        return {
            'code': code,
            'description': desc,
            'duty': duty,
            'extra_info': extra_info
        }
    return None

def main():
    products = load_products()
    print("Quantum Systems Products (with UAE Import Info):\n")
    for prod in products:
        name = prod.get('name')
        ptype = prod.get('type')
        hscode = prod.get('hs_codes', {}).get('uae')
        print(f"Product: {name}\n  Type: {ptype}\n  HS Code (UAE): {hscode}")
        uae_info = get_uae_info(hscode)
        if uae_info:
            print(f"  UAE Description: {uae_info['description']}")
            print(f"  UAE Duty: {uae_info['duty']}")
            print(f"  UAE Extra Info: {uae_info['extra_info']}")
        else:
            print("  [No UAE tariff data found for this code]")
        print()

if __name__ == "__main__":
    main()
