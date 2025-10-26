ALTER TABLE commissions ADD COLUMN commission_date timestamp NOT NULL DEFAULT NOW();
ALTER TABLE commissions ALTER COLUMN commission_date DROP DEFAULT;
UPDATE commissions SET commission_date = (SELECT order_date FROM orders WHERE orders.id = commissions.order_id) WHERE order_id IS NOT NULL;
