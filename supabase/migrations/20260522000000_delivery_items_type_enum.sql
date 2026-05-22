-- ── Create enum type for sales_items.delivery_status (idempotent) ───────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'delivery_items_type'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.delivery_items_type AS ENUM (
      'pending',
      'in_delivery',
      'delivered',
      'self_pickup'
    );
  END IF;
END;
$$;

-- ── Drop triggers on sales_items that depend on delivery_status ──────────────
DROP TRIGGER IF EXISTS trg_sales_items_delivery_status ON public.sales_items;

-- ── Drop existing CHECK constraint(s) on sales_items.delivery_status ─────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.sales_items'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%delivery_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.sales_items DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END;
$$;

-- ── Convert column from TEXT to enum ─────────────────────────────────────────
ALTER TABLE public.sales_items
  ALTER COLUMN delivery_status DROP DEFAULT;

ALTER TABLE public.sales_items
  ALTER COLUMN delivery_status TYPE public.delivery_items_type
  USING delivery_status::text::public.delivery_items_type;

ALTER TABLE public.sales_items
  ALTER COLUMN delivery_status SET DEFAULT 'pending'::public.delivery_items_type;

-- ── Recreate the trigger that was dropped above ───────────────────────────────
DROP TRIGGER IF EXISTS trg_sales_items_delivery_status ON public.sales_items;
CREATE TRIGGER trg_sales_items_delivery_status
  AFTER INSERT OR UPDATE OF delivery_status ON public.sales_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_sales_items_delivery_status_fn();
