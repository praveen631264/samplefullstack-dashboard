-- =============================================
-- DML Script - SampleFullstack Dashboard
-- Inserts sample data into all tables
-- =============================================

-- Clear existing data
DELETE FROM activities;
DELETE FROM orders;
DELETE FROM products;
DELETE FROM users;

-- =============================================
-- 1. Insert Users
-- =============================================
INSERT INTO users (username, password) VALUES
    ('admin', 'admin123'),
    ('john_doe', 'password123'),
    ('jane_smith', 'password456'),
    ('mike_wilson', 'password789'),
    ('sarah_connor', 'password101');

-- =============================================
-- 2. Insert Products
-- =============================================
INSERT INTO products (name, category, price, stock, status) VALUES
    ('Wireless Headphones', 'Electronics', 79.99, 150, 'active'),
    ('Bluetooth Speaker', 'Electronics', 49.99, 200, 'active'),
    ('USB-C Hub', 'Accessories', 34.99, 75, 'active'),
    ('Mechanical Keyboard', 'Electronics', 129.99, 50, 'active'),
    ('Webcam HD Pro', 'Electronics', 89.99, 100, 'active'),
    ('Laptop Stand', 'Accessories', 45.99, 120, 'active'),
    ('Mouse Pad XL', 'Accessories', 19.99, 300, 'active'),
    ('Monitor Light Bar', 'Electronics', 59.99, 80, 'active'),
    ('Desk Organizer', 'Office', 24.99, 180, 'active'),
    ('Cable Management Kit', 'Accessories', 14.99, 250, 'inactive'),
    ('Ergonomic Mouse', 'Electronics', 69.99, 90, 'active'),
    ('Phone Stand', 'Accessories', 12.99, 400, 'active'),
    ('Desk Lamp LED', 'Office', 39.99, 110, 'active'),
    ('Portable Charger', 'Electronics', 29.99, 160, 'active'),
    ('Notebook Set', 'Office', 9.99, 500, 'inactive');

-- =============================================
-- 3. Insert Orders (using product IDs from above)
-- =============================================
INSERT INTO orders (customer_name, product_id, quantity, total_amount, status, created_at) VALUES
    ('Alice Johnson', (SELECT id FROM products WHERE name = 'Wireless Headphones'), 2, 159.98, 'completed', NOW() - INTERVAL '30 days'),
    ('Bob Williams', (SELECT id FROM products WHERE name = 'Bluetooth Speaker'), 1, 49.99, 'completed', NOW() - INTERVAL '28 days'),
    ('Carol Davis', (SELECT id FROM products WHERE name = 'Mechanical Keyboard'), 1, 129.99, 'completed', NOW() - INTERVAL '25 days'),
    ('David Brown', (SELECT id FROM products WHERE name = 'USB-C Hub'), 3, 104.97, 'shipped', NOW() - INTERVAL '22 days'),
    ('Emma Wilson', (SELECT id FROM products WHERE name = 'Webcam HD Pro'), 1, 89.99, 'completed', NOW() - INTERVAL '20 days'),
    ('Frank Miller', (SELECT id FROM products WHERE name = 'Laptop Stand'), 2, 91.98, 'completed', NOW() - INTERVAL '18 days'),
    ('Grace Lee', (SELECT id FROM products WHERE name = 'Monitor Light Bar'), 1, 59.99, 'shipped', NOW() - INTERVAL '15 days'),
    ('Henry Taylor', (SELECT id FROM products WHERE name = 'Ergonomic Mouse'), 2, 139.98, 'completed', NOW() - INTERVAL '12 days'),
    ('Ivy Chen', (SELECT id FROM products WHERE name = 'Wireless Headphones'), 1, 79.99, 'processing', NOW() - INTERVAL '10 days'),
    ('Jack Anderson', (SELECT id FROM products WHERE name = 'Desk Lamp LED'), 3, 119.97, 'completed', NOW() - INTERVAL '8 days'),
    ('Karen White', (SELECT id FROM products WHERE name = 'Portable Charger'), 4, 119.96, 'shipped', NOW() - INTERVAL '6 days'),
    ('Leo Martinez', (SELECT id FROM products WHERE name = 'Mouse Pad XL'), 2, 39.98, 'completed', NOW() - INTERVAL '5 days'),
    ('Mia Robinson', (SELECT id FROM products WHERE name = 'Phone Stand'), 5, 64.95, 'processing', NOW() - INTERVAL '3 days'),
    ('Noah Clark', (SELECT id FROM products WHERE name = 'Bluetooth Speaker'), 2, 99.98, 'pending', NOW() - INTERVAL '2 days'),
    ('Olivia Hall', (SELECT id FROM products WHERE name = 'Mechanical Keyboard'), 1, 129.99, 'pending', NOW() - INTERVAL '1 day'),
    ('Peter Young', (SELECT id FROM products WHERE name = 'USB-C Hub'), 1, 34.99, 'cancelled', NOW() - INTERVAL '4 days'),
    ('Quinn Adams', (SELECT id FROM products WHERE name = 'Desk Organizer'), 2, 49.98, 'completed', NOW() - INTERVAL '7 days'),
    ('Rachel King', (SELECT id FROM products WHERE name = 'Webcam HD Pro'), 1, 89.99, 'completed', NOW() - INTERVAL '9 days'),
    ('Sam Wright', (SELECT id FROM products WHERE name = 'Laptop Stand'), 1, 45.99, 'shipped', NOW() - INTERVAL '11 days'),
    ('Tina Lopez', (SELECT id FROM products WHERE name = 'Cable Management Kit'), 3, 44.97, 'completed', NOW() - INTERVAL '14 days');

-- =============================================
-- 4. Insert Activities
-- =============================================
INSERT INTO activities (type, description, entity_name, created_at) VALUES
    ('product_created', 'New product added to catalog', 'Wireless Headphones', NOW() - INTERVAL '30 days'),
    ('product_created', 'New product added to catalog', 'Bluetooth Speaker', NOW() - INTERVAL '30 days'),
    ('product_created', 'New product added to catalog', 'Mechanical Keyboard', NOW() - INTERVAL '29 days'),
    ('order_placed', 'New order received from customer', 'Alice Johnson', NOW() - INTERVAL '28 days'),
    ('order_placed', 'New order received from customer', 'Bob Williams', NOW() - INTERVAL '27 days'),
    ('order_completed', 'Order has been delivered', 'Alice Johnson', NOW() - INTERVAL '25 days'),
    ('product_updated', 'Product stock updated', 'USB-C Hub', NOW() - INTERVAL '22 days'),
    ('order_placed', 'New order received from customer', 'David Brown', NOW() - INTERVAL '20 days'),
    ('order_shipped', 'Order has been shipped', 'David Brown', NOW() - INTERVAL '18 days'),
    ('user_registered', 'New user account created', 'mike_wilson', NOW() - INTERVAL '15 days'),
    ('order_placed', 'New order received from customer', 'Grace Lee', NOW() - INTERVAL '14 days'),
    ('product_updated', 'Product price updated', 'Monitor Light Bar', NOW() - INTERVAL '12 days'),
    ('order_completed', 'Order has been delivered', 'Frank Miller', NOW() - INTERVAL '10 days'),
    ('order_placed', 'New order received from customer', 'Ivy Chen', NOW() - INTERVAL '8 days'),
    ('product_created', 'New product added to catalog', 'Notebook Set', NOW() - INTERVAL '7 days'),
    ('order_placed', 'New order received from customer', 'Noah Clark', NOW() - INTERVAL '5 days'),
    ('order_placed', 'New order received from customer', 'Mia Robinson', NOW() - INTERVAL '3 days'),
    ('product_updated', 'Product status changed to inactive', 'Cable Management Kit', NOW() - INTERVAL '2 days'),
    ('order_placed', 'New order received from customer', 'Olivia Hall', NOW() - INTERVAL '1 day'),
    ('user_registered', 'New user account created', 'sarah_connor', NOW() - INTERVAL '1 day');

-- =============================================
-- 5. Verification Queries
-- =============================================
SELECT '--- TABLE COUNTS ---' AS info;
SELECT 'Users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Activities', COUNT(*) FROM activities;

SELECT '--- PRODUCTS SUMMARY ---' AS info;
SELECT name, category, price, stock, status FROM products ORDER BY name;

SELECT '--- ORDERS SUMMARY ---' AS info;
SELECT o.customer_name, p.name AS product, o.quantity, o.total_amount, o.status, o.created_at::date
FROM orders o
JOIN products p ON o.product_id = p.id
ORDER BY o.created_at DESC;

SELECT '--- ORDER STATUS BREAKDOWN ---' AS info;
SELECT status, COUNT(*) AS count, SUM(total_amount) AS total_revenue
FROM orders
GROUP BY status
ORDER BY count DESC;

SELECT '--- TOP 5 PRODUCTS BY REVENUE ---' AS info;
SELECT p.name, p.category, SUM(o.quantity) AS total_sold, SUM(o.total_amount) AS total_revenue
FROM orders o
JOIN products p ON o.product_id = p.id
GROUP BY p.name, p.category
ORDER BY total_revenue DESC
LIMIT 5;

SELECT '--- RECENT ACTIVITIES ---' AS info;
SELECT type, description, entity_name, created_at::date
FROM activities
ORDER BY created_at DESC
LIMIT 10;
