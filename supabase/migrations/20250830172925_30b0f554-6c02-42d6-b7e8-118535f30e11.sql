-- Ensure only one active broadcast at a time
CREATE OR REPLACE FUNCTION public.ensure_single_active_broadcast()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.active IS TRUE THEN
    -- Deactivate all other broadcasts
    UPDATE public.broadcasts
    SET active = FALSE, updated_at = now()
    WHERE active = TRUE AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to enforce the rule on insert/update
DROP TRIGGER IF EXISTS trg_ensure_single_active_broadcast ON public.broadcasts;
CREATE TRIGGER trg_ensure_single_active_broadcast
BEFORE INSERT OR UPDATE ON public.broadcasts
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_active_broadcast();

-- Defensive uniqueness to prevent multiple active rows
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'unique_single_active_broadcast'
  ) THEN
    CREATE UNIQUE INDEX unique_single_active_broadcast
    ON public.broadcasts ((active))
    WHERE active = TRUE;
  END IF;
END $$;