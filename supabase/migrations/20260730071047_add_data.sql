-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

DROP POLICY dev_allow_all ON public.accounts_payable;

DROP POLICY dev_allow_all ON public.accounts_receivable;

DROP POLICY dev_allow_all ON public.agents;

DROP POLICY dev_allow_all ON public.attraction_photos;

DROP POLICY dev_allow_all ON public.attractions;

DROP POLICY dev_allow_all ON public.booking_activities;

DROP POLICY dev_allow_all ON public.booking_changes;

DROP POLICY dev_allow_all ON public.booking_itinerary;

DROP POLICY dev_allow_all ON public.bookings;

DROP POLICY dev_allow_all ON public.cal_events;

DROP POLICY dev_allow_all ON public.chat_channels;

DROP POLICY dev_allow_all ON public.chat_messages;

DROP POLICY dev_allow_all ON public.chat_reactions;

DROP POLICY dev_allow_all ON public.comms;

DROP POLICY dev_allow_all ON public.contracts;

DROP POLICY dev_allow_all ON public.cruises;

DROP POLICY dev_allow_all ON public.customers;

DROP POLICY dev_allow_all ON public.dev_notes;

DROP POLICY dev_allow_all ON public.feedback;

DROP POLICY dev_allow_all ON public.finance;

DROP POLICY dev_allow_all ON public.guide_reviews;

DROP POLICY dev_allow_all ON public.guides;

DROP POLICY dev_allow_all ON public.leads;

DROP POLICY dev_allow_all ON public.photo_tags;

DROP POLICY dev_allow_all ON public.photos;

DROP POLICY dev_allow_all ON public.pricing_acc_cruise_rates;

DROP POLICY dev_allow_all ON public.pricing_acc_properties;

DROP POLICY dev_allow_all ON public.pricing_acc_room_rates;

DROP POLICY dev_allow_all ON public.pricing_catalog_imports;

DROP POLICY dev_allow_all ON public.pricing_ess_car_rates;

DROP POLICY dev_allow_all ON public.pricing_ess_cost_lines;

DROP POLICY dev_allow_all ON public.pricing_ess_hotel_rates;

DROP POLICY dev_allow_all ON public.pricing_ess_notes;

DROP POLICY dev_allow_all ON public.pricing_ess_products;

DROP POLICY dev_allow_all ON public.pricing_ess_services;

DROP POLICY dev_allow_all ON public.pricing_settings;

DROP POLICY dev_allow_all ON public.product_photos;

DROP POLICY dev_allow_all ON public.product_pricing;

DROP POLICY dev_allow_all ON public.products;

DROP POLICY dev_allow_all ON public.restaurants;

DROP POLICY dev_allow_all ON public.salary_records;

DROP POLICY dev_allow_all ON public.staff;

DROP POLICY dev_allow_all ON public.supplier_tags;

DROP POLICY dev_allow_all ON public.suppliers;

DROP POLICY dev_allow_all ON public.tasks;

DROP POLICY dev_allow_all ON public.tax_reports;

DROP POLICY dev_allow_all ON public.tour_drafts;

DROP POLICY dev_allow_all ON public.tour_outline_days;

DROP POLICY dev_allow_all ON public.transport;

DROP POLICY dev_allow_all ON public.weather_fetch_log;

DROP POLICY dev_allow_all ON public.weather_forecast_cache;

CREATE POLICY authenticated_access ON public.accounts_payable
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.accounts_receivable
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.agents
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.attraction_photos
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.attractions
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.booking_activities
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.booking_changes
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.booking_itinerary
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.bookings
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.cal_events
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.chat_channels
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.chat_messages
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.chat_reactions
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.comms
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.contracts
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.cruises
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.customers
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.dev_notes
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.feedback
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.finance
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.guide_reviews
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.guides
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.hotel_rooms
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.hotels
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.leads
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.photo_tags
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.photos
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.pricing_acc_cruise_rates
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.pricing_acc_properties
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.pricing_acc_room_rates
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.pricing_catalog_imports
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.pricing_ess_car_rates
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.pricing_ess_cost_lines
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.pricing_ess_hotel_rates
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.pricing_ess_notes
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.pricing_ess_products
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.pricing_ess_services
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.pricing_settings
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.product_photos
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.product_pricing
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.products
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.restaurants
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.salary_records
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.staff
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.supplier_tags
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.suppliers
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.tasks
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.tax_reports
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.tour_drafts
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.tour_outline_days
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.transport
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.weather_fetch_log
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_access ON public.weather_forecast_cache
  TO authenticated
  USING (true)
  WITH CHECK (true);