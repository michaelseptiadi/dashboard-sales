-- When a delivery transitions to in_progress, also set any still-pending
-- sales_items to in_delivery (covers deliveries created while the enum
-- trigger was broken, or any items that missed the INSERT trigger).

CREATE OR REPLACE FUNCTION public.trg_delivery_status_change_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.delivery_status = OLD.delivery_status THEN
    RETURN NEW;
  END IF;

  IF NEW.delivery_status = 'delivered' THEN
    -- Mark all delivery items as delivered
    UPDATE public.sales_items si
    SET delivery_status = 'delivered'::public.delivery_items_type
    FROM public.delivery_items di
    WHERE di.delivery_id = NEW.id AND di.sales_item_id = si.id;

  ELSIF NEW.delivery_status = 'in_progress' THEN
    -- Move any still-pending items to in_delivery
    UPDATE public.sales_items si
    SET delivery_status = 'in_delivery'::public.delivery_items_type
    FROM public.delivery_items di
    WHERE di.delivery_id = NEW.id AND di.sales_item_id = si.id
      AND si.delivery_status = 'pending'::public.delivery_items_type;

    -- Also revert any previously-delivered items back to in_delivery (admin correction)
    UPDATE public.sales_items si
    SET delivery_status = 'in_delivery'::public.delivery_items_type
    FROM public.delivery_items di
    WHERE di.delivery_id = NEW.id AND di.sales_item_id = si.id
      AND si.delivery_status = 'delivered'::public.delivery_items_type;

  ELSIF NEW.delivery_status = 'pending' THEN
    -- Admin correction: undo a previously delivered status
    UPDATE public.sales_items si
    SET delivery_status = 'in_delivery'::public.delivery_items_type
    FROM public.delivery_items di
    WHERE di.delivery_id = NEW.id AND di.sales_item_id = si.id
      AND si.delivery_status = 'delivered'::public.delivery_items_type;

  ELSIF NEW.delivery_status = 'failed' THEN
    -- Revert in_delivery items back to pending
    UPDATE public.sales_items si
    SET delivery_status = 'pending'::public.delivery_items_type
    FROM public.delivery_items di
    WHERE di.delivery_id = NEW.id AND di.sales_item_id = si.id
      AND si.delivery_status = 'in_delivery'::public.delivery_items_type;
  END IF;

  RETURN NEW;
END;
$$;
