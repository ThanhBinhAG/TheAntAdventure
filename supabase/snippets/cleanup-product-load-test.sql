-- LOCAL TEST DATA ONLY: removes the synthetic rows created by product-load-test-100.sql.
-- Related product_pricing rows are removed automatically by the FK cascade.
delete from public.products where code like 'LOADTEST-%';
