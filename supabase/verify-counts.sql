-- Kiểm tra số dòng trên Supabase sau khi import
-- Chạy trong: Supabase Dashboard → SQL → New query → Run
-- So sánh với cột "expected" bên dưới (từ import-full-data.sql / seed HTML)

SELECT 'customers'         AS table_name, COUNT(*) AS rows, 27  AS expected FROM customers
UNION ALL SELECT 'comms',              COUNT(*), 4    FROM comms
UNION ALL SELECT 'leads',              COUNT(*), 30   FROM leads
UNION ALL SELECT 'bookings',           COUNT(*), 7    FROM bookings
UNION ALL SELECT 'agents',             COUNT(*), 6    FROM agents
UNION ALL SELECT 'guides',             COUNT(*), 24   FROM guides
UNION ALL SELECT 'products',           COUNT(*), 196  FROM products
UNION ALL SELECT 'finance',            COUNT(*), 11   FROM finance
UNION ALL SELECT 'ar',                 COUNT(*), 7    FROM ar
UNION ALL SELECT 'ap',                 COUNT(*), 9    FROM ap
UNION ALL SELECT 'tax',                COUNT(*), 2    FROM tax
UNION ALL SELECT 'staff',              COUNT(*), 5    FROM staff
UNION ALL SELECT 'tasks',              COUNT(*), 8    FROM tasks
UNION ALL SELECT 'feedback',           COUNT(*), 5    FROM feedback
UNION ALL SELECT 'contracts',          COUNT(*), 1    FROM contracts
UNION ALL SELECT 'photos',             COUNT(*), 12   FROM photos
UNION ALL SELECT 'cal_events',         COUNT(*), 7    FROM cal_events
UNION ALL SELECT 'dev_notes',          COUNT(*), 3    FROM dev_notes
UNION ALL SELECT 'cruises',            COUNT(*), 1    FROM cruises
UNION ALL SELECT 'transport',          COUNT(*), 3    FROM transport
UNION ALL SELECT 'restaurants',        COUNT(*), 3    FROM restaurants
UNION ALL SELECT 'special_suppliers',   COUNT(*), 12   FROM special_suppliers
UNION ALL SELECT 'crm_messages',       COUNT(*), 1    FROM crm_messages
ORDER BY table_name;

-- crm_messages: 1 row (id='default'), bên trong có 10 kênh chat
-- Kiểm tra số kênh chat:
SELECT jsonb_object_keys(data) AS chat_channel
FROM crm_messages
WHERE id = 'default';
