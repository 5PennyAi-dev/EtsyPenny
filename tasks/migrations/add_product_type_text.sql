-- Migration: Add product_type_text column + "Custom type" sentinel row
-- Run this in Supabase SQL Editor

-- 1. Add product_type_text column for storing custom type names
ALTER TABLE listings ADD COLUMN IF NOT EXISTS product_type_text TEXT;

-- 2. Insert a sentinel "Custom type" row into product_types (idempotent)
INSERT INTO product_types (name)
SELECT 'Custom type'
WHERE NOT EXISTS (SELECT 1 FROM product_types WHERE name = 'Custom type');

-- Verify:
-- SELECT id, name FROM product_types WHERE name = 'Custom type';
-- Should return exactly 1 row. Copy the `id` if needed for debugging.
