import sqlite3
import json
import os

DB_PATH = 'hscode.db'
UAE_JSON = 'hs_codes_uae.json'
US_JSON = 'hs_codes_us.json'
CN_JSON = 'hs_codes_cn.json'

# Helper to get or create a country
def get_or_create_country(cur, name, iso_code=None):
    cur.execute('SELECT id FROM countries WHERE name=?', (name,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute('INSERT INTO countries (name, iso_code) VALUES (?, ?)', (name, iso_code))
    return cur.lastrowid

# Insert customs clearance requirements
def insert_customs(cur, hscode_id, customs_list):
    for entry in customs_list:
        cur.execute('''INSERT INTO customs_clearance_requirements
            (hscode_id, customs_code, supervision_documents_name, issuing_authority)
            VALUES (?, ?, ?, ?)''',
            (hscode_id, entry.get('Customs Code'), entry.get('Supervision Documents Name'), entry.get('Issuing Authority')))

# Insert CIQ inspection requirements
def insert_ciq(cur, hscode_id, ciq_list):
    for entry in ciq_list:
        cur.execute('''INSERT INTO ciq_inspection_requirements
            (hscode_id, ciq_inspection_code, ciq_supervision_mode)
            VALUES (?, ?, ?)''',
            (hscode_id, entry.get('CIQ Inspection Code'), entry.get('CIQ Supervision Mode')))

# Import HS codes from a JSON file
# Handles both simple and rich/nested data
def import_hscodes(json_path, country_name, iso_code=None):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    country_id = get_or_create_country(cur, country_name, iso_code)
    count = 0
    for item in data:
        # China rich format
        if 'HTS Code' in item:
            code = str(item.get('HTS Code', '')).strip()
            desc = item.get('Article Description', '').strip()
            duty = str(item.get('MFN', '')).strip() if 'MFN' in item else None
            # Remove fields that go into other tables or columns
            customs = item.pop('Customs Clearance Requirements', None)
            ciq = item.pop('CIQ Inspection and Quarantine Requirements', None)
            # Remove standard fields
            std_keys = {'HTS Code', 'Article Description', 'MFN', 'Gen', 'Provisional Import tariff', 'Export tariff', 'Export Tax Rebate', 'TaxVAT', 'Consumption Tax', 'Regulations & Restrictions', 'Inspection & Quarantine', 'Unit of Quantity'}
            extra = {k: v for k, v in item.items() if k not in std_keys}
            extra_info = json.dumps(extra) if extra else None
            cur.execute('INSERT INTO hscodes (code, description, country_id, duty, extra_info) VALUES (?, ?, ?, ?, ?)',
                        (code, desc, country_id, duty, extra_info))
            hscode_id = cur.lastrowid
            if customs:
                insert_customs(cur, hscode_id, customs)
            if ciq:
                insert_ciq(cur, hscode_id, ciq)
            count += 1
        # Simple format (US, UAE, etc)
        else:
            code = str(item.get('hs_code', '')).strip()
            desc = item.get('description', '').strip()
            duty = str(item.get('duty', '')).strip() if 'duty' in item else None
            cur.execute('INSERT INTO hscodes (code, description, country_id, duty) VALUES (?, ?, ?, ?)',
                        (code, desc, country_id, duty))
            count += 1
    conn.commit()
    conn.close()
    print(f"Imported {count} HS codes for {country_name}")

def main():
    if os.path.exists(UAE_JSON):
        import_hscodes(UAE_JSON, 'United Arab Emirates', 'AE')
    else:
        print(f"{UAE_JSON} not found.")
    if os.path.exists(US_JSON):
        import_hscodes(US_JSON, 'United States', 'US')
    else:
        print(f"{US_JSON} not found.")
    if os.path.exists(CN_JSON):
        import_hscodes(CN_JSON, 'China', 'CN')
    else:
        print(f"{CN_JSON} not found.")

if __name__ == '__main__':
    main()
