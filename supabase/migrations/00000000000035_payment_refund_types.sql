-- SPEC-014 (RF-PAY-004) — enum values for refunded payments.
-- Kept apart from 0036: a value added with ALTER TYPE ... ADD VALUE cannot be
-- used in the same transaction that adds it.

alter type public.payment_status add value if not exists 'REFUNDED';
alter type public.notification_type add value if not exists 'SUPPLY_ORDER_REFUNDED';
