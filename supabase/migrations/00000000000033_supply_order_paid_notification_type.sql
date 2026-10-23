-- SPEC-013 (VES-24) — notification type for a paid supply order.
-- Kept apart from 0034: a value added with ALTER TYPE ... ADD VALUE cannot be
-- used in the same transaction that adds it.

alter type public.notification_type add value if not exists 'SUPPLY_ORDER_PAID';
