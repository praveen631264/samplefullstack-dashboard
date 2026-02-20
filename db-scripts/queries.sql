-- =============================================
-- Query Script - SampleFullstack Dashboard
-- Read-only queries to inspect database state
-- =============================================

-- 1. Show all tables and their row counts
SELECT '=== TABLE COUNTS ===' AS section;
SELECT 'Users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Activities', COUNT(*) FROM activities;

-- 2. List all products
SELECT '=== ALL PRODUCTS ===' AS section;
SELECT id, name, category, price, stock, status
FROM products
ORDER BY category, name;

-- 3. List all orders with product names
SELECT '=== ALL ORDERS ===' AS section;
SELECT o.id, o.customer_name, p.name AS product_name, o.quantity,
       o.total_amount, o.status, o.created_at
FROM orders o
LEFT JOIN products p ON o.product_id = p.id
ORDER BY o.created_at DESC;

-- 4. Dashboard metrics
SELECT '=== DASHBOARD METRICS ===' AS section;
SELECT
    COALESCE(SUM(total_amount), 0) AS total_revenue,
    COUNT(*) AS total_orders,
    (SELECT COUNT(*) FROM products) AS total_products,
    COUNT(DISTINCT customer_name) AS active_customers
FROM orders;

-- 5. Revenue by month
SELECT '=== REVENUE BY MONTH ===' AS section;
SELECT
    TO_CHAR(created_at, 'Mon YYYY') AS month,
    SUM(total_amount) AS revenue,
    COUNT(*) AS order_count
FROM orders
GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
ORDER BY DATE_TRUNC('month', created_at);

-- 6. Orders by status
SELECT '=== ORDERS BY STATUS ===' AS section;
SELECT status, COUNT(*) AS count, SUM(total_amount) AS total_amount
FROM orders
GROUP BY status
ORDER BY count DESC;

-- 7. Top products by revenue
SELECT '=== TOP PRODUCTS BY REVENUE ===' AS section;
SELECT p.name, p.category,
       SUM(o.quantity) AS total_sold,
       SUM(o.total_amount) AS total_revenue
FROM orders o
JOIN products p ON o.product_id = p.id
GROUP BY p.name, p.category
ORDER BY total_revenue DESC
LIMIT 10;

-- 8. Recent activities
SELECT '=== RECENT ACTIVITIES ===' AS section;
SELECT type, description, entity_name, created_at
FROM activities
ORDER BY created_at DESC
LIMIT 20;

-- 9. Products with low stock (below 100)
SELECT '=== LOW STOCK PRODUCTS ===' AS section;
SELECT name, category, stock, status
FROM products
WHERE stock < 100
ORDER BY stock ASC;

-- 10. Daily order summary (last 30 days)
SELECT '=== DAILY ORDER SUMMARY (LAST 30 DAYS) ===' AS section;
SELECT
    created_at::date AS order_date,
    COUNT(*) AS orders,
    SUM(total_amount) AS daily_revenue
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY created_at::date
ORDER BY order_date DESC;
