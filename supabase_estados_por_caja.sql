BEGIN;

ALTER TABLE public.estados
  ADD COLUMN IF NOT EXISTS caja_id BIGINT;

DO $$
DECLARE
  suiza_id BIGINT;
  suiza_count BIGINT;
BEGIN
  SELECT COUNT(*), MIN(id)
  INTO suiza_count, suiza_id
  FROM public.cajas
  WHERE LOWER(BTRIM(nombre)) = 'suiza';

  IF suiza_count <> 1 THEN
    RAISE EXCEPTION 'Se esperaba encontrar exactamente una caja llamada Suiza; se encontraron %.', suiza_count;
  END IF;

  UPDATE public.estados
  SET caja_id = suiza_id
  WHERE caja_id IS NULL;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'estados_caja_id_fkey'
      AND conrelid = 'public.estados'::regclass
  ) THEN
    ALTER TABLE public.estados
      ADD CONSTRAINT estados_caja_id_fkey
      FOREIGN KEY (caja_id) REFERENCES public.cajas(id)
      ON DELETE RESTRICT;
  END IF;
END;
$$;

ALTER TABLE public.estados
  ALTER COLUMN caja_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_estados_caja_id
  ON public.estados(caja_id);

COMMIT;
