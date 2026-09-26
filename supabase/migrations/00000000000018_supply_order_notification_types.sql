-- SPEC-012 — notification types for supply orders (RF-ORD-006).
-- Kept apart from 0019: a value added with ALTER TYPE ... ADD VALUE cannot be
-- used in the same transaction that adds it.

alter type public.notification_type add value if not exists 'SUPPLY_ORDER_PLACED';
alter type public.notification_type add value if not exists 'SUPPLY_ORDER_CONFIRMED';
alter type public.notification_type add value if not exists 'SUPPLY_ORDER_REJECTED';
alter type public.notification_type add value if not exists 'SUPPLY_ORDER_CANCELLED';
