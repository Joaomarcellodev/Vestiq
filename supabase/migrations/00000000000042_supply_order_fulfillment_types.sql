-- VES-32 — new supply order stages and their notifications.
-- Enum values are added in their own migration: Postgres can't use a value in
-- the transaction that adds it (same as 0018, 0033 and 0035).

alter type public.supply_order_status add value if not exists 'IN_PRODUCTION';
alter type public.supply_order_status add value if not exists 'SHIPPED';
alter type public.supply_order_status add value if not exists 'DELIVERED';

alter type public.notification_type add value if not exists 'SUPPLY_ORDER_IN_PRODUCTION';
alter type public.notification_type add value if not exists 'SUPPLY_ORDER_SHIPPED';
alter type public.notification_type add value if not exists 'SUPPLY_ORDER_DELIVERED';
