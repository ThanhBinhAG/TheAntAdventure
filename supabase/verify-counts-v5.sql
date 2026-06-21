-- Row counts after import-v5-data.sql (generated from import-full-data.sql backup)
-- Expected: rows column should equal expected column

select 'agents' as table_name, count(*) as rows, 6 as expected from agents
union all select 'customers', count(*), 27 from customers
union all select 'leads', count(*), 30 from leads
union all select 'bookings', count(*), 7 from bookings
union all select 'booking_itinerary', count(*), 33 from booking_itinerary
union all select 'booking_activities', count(*), 70 from booking_activities
union all select 'comms', count(*), 4 from comms
union all select 'guides', count(*), 24 from guides
union all select 'products', count(*), 196 from products
union all select 'finance', count(*), 11 from finance
union all select 'accounts_receivable', count(*), 7 from accounts_receivable
union all select 'accounts_payable', count(*), 9 from accounts_payable
union all select 'tax_reports', count(*), 2 from tax_reports
union all select 'staff', count(*), 5 from staff
union all select 'tasks', count(*), 8 from tasks
union all select 'feedback', count(*), 5 from feedback
union all select 'contracts', count(*), 1 from contracts
union all select 'photos', count(*), 12 from photos
union all select 'photo_tags', count(*), 48 from photo_tags
union all select 'suppliers', count(*), 12 from suppliers
union all select 'supplier_tags', count(*), 35 from supplier_tags
union all select 'cruises', count(*), 1 from cruises
union all select 'transport', count(*), 3 from transport
union all select 'restaurants', count(*), 3 from restaurants
union all select 'cal_events', count(*), 7 from cal_events
union all select 'dev_notes', count(*), 3 from dev_notes
union all select 'chat_channels', count(*), 10 from chat_channels
union all select 'chat_messages', count(*), 8 from chat_messages
union all select 'chat_reactions', count(*), 7 from chat_reactions
order by table_name;

-- Mismatch helper (run separately if needed):
-- select * from (
--   ... above query ...
-- ) v where rows <> expected;
