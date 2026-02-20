-- =============================================
-- DDL Script - SampleFullstack Dashboard
-- Creates all database tables
-- =============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop tables if they exist (in correct order due to dependencies)
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table
CREATE TABLE users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);

-- 2. Products Table
CREATE TABLE products (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active'
);

-- 3. Orders Table
CREATE TABLE orders (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    product_id VARCHAR NOT NULL,
    quantity INTEGER NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Activities Table
CREATE TABLE activities (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Verify tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
