-- HS Code Database Schema

DROP TABLE IF EXISTS customs_clearance_requirements;
DROP TABLE IF EXISTS ciq_inspection_requirements;
DROP TABLE IF EXISTS brand_products;
DROP TABLE IF EXISTS product_hscode;
DROP TABLE IF EXISTS brands;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS hscodes;
DROP TABLE IF EXISTS countries;

CREATE TABLE countries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    iso_code TEXT UNIQUE
);

CREATE TABLE hscodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    description TEXT,
    country_id INTEGER,
    duty TEXT,
    extra_info TEXT, -- JSON for additional fields
    FOREIGN KEY (country_id) REFERENCES countries(id)
);

CREATE TABLE customs_clearance_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hscode_id INTEGER,
    customs_code TEXT,
    supervision_documents_name TEXT,
    issuing_authority TEXT,
    FOREIGN KEY (hscode_id) REFERENCES hscodes(id)
);

CREATE TABLE ciq_inspection_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hscode_id INTEGER,
    ciq_inspection_code TEXT,
    ciq_supervision_mode TEXT,
    FOREIGN KEY (hscode_id) REFERENCES hscodes(id)
);

CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT
);

CREATE TABLE brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    country_id INTEGER,
    FOREIGN KEY (country_id) REFERENCES countries(id)
);

CREATE TABLE brand_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id INTEGER,
    product_id INTEGER,
    hscode_id INTEGER,
    FOREIGN KEY (brand_id) REFERENCES brands(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (hscode_id) REFERENCES hscodes(id)
);

CREATE TABLE product_hscode (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    hscode_id INTEGER,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (hscode_id) REFERENCES hscodes(id)
);
