-- ============================================================
--  RESET v5 schema — drop ALL CRM tables (destructive)
--  Run BEFORE schema.sql / baseline migration for a clean reinstall
--  ⚠️ BACKUP FIRST if you have live data
-- ============================================================

-- Pricing workbook (children first)
drop table if exists pricing_catalog_imports cascade;
drop table if exists pricing_acc_cruise_rates cascade;
drop table if exists pricing_acc_room_rates cascade;
drop table if exists pricing_acc_properties cascade;
drop table if exists pricing_ess_notes cascade;
drop table if exists pricing_ess_hotel_rates cascade;
drop table if exists pricing_ess_car_rates cascade;
drop table if exists pricing_ess_services cascade;
drop table if exists pricing_ess_cost_lines cascade;
drop table if exists pricing_ess_products cascade;
drop table if exists pricing_settings cascade;

-- Weather
drop table if exists weather_fetch_log cascade;
drop table if exists weather_forecast_cache cascade;
drop table if exists weather_destinations cascade;

-- Chat / calendar / notes
drop table if exists chat_reactions cascade;
drop table if exists chat_messages cascade;
drop table if exists chat_channels cascade;
drop table if exists cal_events cascade;
drop table if exists dev_notes cascade;

-- Attractions / photos / hotels
drop table if exists attraction_photos cascade;
drop table if exists attractions cascade;
drop table if exists product_photos cascade;
drop table if exists photo_tags cascade;
drop table if exists photos cascade;
drop table if exists hotel_rooms cascade;
drop table if exists hotels cascade;

-- Suppliers & inventory
drop table if exists supplier_tags cascade;
drop table if exists restaurants cascade;
drop table if exists transport cascade;
drop table if exists cruises cascade;
drop table if exists suppliers cascade;

-- Bookings / tour design
drop table if exists booking_activities cascade;
drop table if exists booking_itinerary cascade;
drop table if exists booking_changes cascade;
drop table if exists bookings cascade;
drop table if exists tour_outline_days cascade;
drop table if exists tour_drafts cascade;
drop table if exists guide_reviews cascade;
drop table if exists salary_records cascade;

-- Core CRM modules
drop table if exists feedback cascade;
drop table if exists contracts cascade;
drop table if exists tasks cascade;
drop table if exists staff cascade;
drop table if exists tax_reports cascade;
drop table if exists accounts_payable cascade;
drop table if exists accounts_receivable cascade;
drop table if exists finance cascade;
drop table if exists comms cascade;
drop table if exists leads cascade;
drop table if exists guides cascade;
drop table if exists product_pricing cascade;
drop table if exists products cascade;
drop table if exists customers cascade;
drop table if exists agents cascade;

-- Legacy v4.3 JSONB tables (if still present)
drop table if exists crm_messages cascade;
drop table if exists special_suppliers cascade;
drop table if exists ar cascade;
drop table if exists ap cascade;
drop table if exists tax cascade;

drop function if exists set_updated_at() cascade;

-- Next step: run supabase/schema.sql (or npm run db:push on empty DB)
