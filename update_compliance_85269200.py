import sqlite3
import json

db_file = 'hscode.db'

# US compliance info
us_extra_info = {
    "eccn": "5A991 (most commercial radios); 5A002 (if encryption)",
    "itar": "Not ITAR unless military/defense",
    "export_license_required": "NLR for most destinations; license may be required for 5A002 or embargoed countries",
    "compliance_notes": "Check CCL and ITAR for final classification; consult Silvus or compliance officer"
}

# UAE compliance info
uae_extra_info = {
    "tdra_approval_required": "Yes, for most radio equipment",
    "import_permit_required": "Yes, for wireless/telecom equipment",
    "compliance_notes": "Check with UAE TDRA for type approval and import permit requirements"
}

conn = sqlite3.connect(db_file)
cursor = conn.cursor()

# Update US record
cursor.execute("""
    UPDATE hscodes SET extra_info = ?
    WHERE code = '85269200' AND country_id = (SELECT id FROM countries WHERE iso_code = 'US')
""", (json.dumps(us_extra_info),))

# Update UAE record
cursor.execute("""
    UPDATE hscodes SET extra_info = ?
    WHERE code = '85269200' AND country_id = (SELECT id FROM countries WHERE iso_code = 'AE')
""", (json.dumps(uae_extra_info),))

conn.commit()
conn.close()

print("Compliance info updated for 85269200 (US and UAE).")
