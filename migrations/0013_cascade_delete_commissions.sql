-- Migration: Add CASCADE delete to commissions.order_id foreign key
-- This ensures that when an order is deleted (e.g., from WooCommerce sync),
-- all associated commission records are automatically deleted as well.

-- Drop ALL possible existing foreign key constraints to ensure idempotency
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_order_id_fkey;
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_order_id_orders_id_fk;

-- Re-add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE commissions 
ADD CONSTRAINT commissions_order_id_orders_id_fk 
FOREIGN KEY (order_id) 
REFERENCES orders(id) 
ON DELETE CASCADE;
