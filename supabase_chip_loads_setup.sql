BEGIN;

CREATE TABLE IF NOT EXISTS public.cargas_fichas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fichas_id BIGINT NOT NULL REFERENCES public.fichas(id) ON DELETE CASCADE,
  valor NUMERIC(14, 2) NOT NULL,
  fecha_hora_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cargas_fichas_fichas
  ON public.cargas_fichas(fichas_id);

ALTER TABLE public.cargas_fichas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dev_read_cargas_fichas ON public.cargas_fichas;
CREATE POLICY dev_read_cargas_fichas
  ON public.cargas_fichas
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS dev_insert_cargas_fichas ON public.cargas_fichas;
CREATE POLICY dev_insert_cargas_fichas
  ON public.cargas_fichas
  FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.fichas AS chips
      JOIN public.turnos AS shifts ON shifts.id = chips.turno_id
      WHERE chips.id = cargas_fichas.fichas_id
        AND shifts.abierto IS TRUE
    )
  );

CREATE OR REPLACE FUNCTION public.create_chip_load(p_chip_id BIGINT, p_value NUMERIC)
RETURNS public.cargas_fichas
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  target_chip public.fichas%ROWTYPE;
  new_load public.cargas_fichas%ROWTYPE;
BEGIN
  IF p_value IS NULL OR p_value <= 0 THEN
    RAISE EXCEPTION 'Ingresá un monto mayor a cero';
  END IF;

  SELECT *
  INTO target_chip
  FROM public.fichas
  WHERE id = p_chip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la plataforma de fichas seleccionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.turnos
    WHERE id = target_chip.turno_id
      AND abierto IS TRUE
  ) THEN
    RAISE EXCEPTION 'Solo se pueden cargar fichas en un turno abierto';
  END IF;

  UPDATE public.fichas
  SET fichas_inicial = fichas_inicial + p_value
  WHERE id = target_chip.id;

  INSERT INTO public.cargas_fichas (fichas_id, valor)
  VALUES (target_chip.id, p_value)
  RETURNING * INTO new_load;

  RETURN new_load;
END;
$$;

GRANT SELECT, INSERT ON public.cargas_fichas TO anon;
GRANT SELECT, UPDATE ON public.fichas TO anon;
GRANT SELECT ON public.turnos TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.cargas_fichas_id_seq TO anon;
GRANT EXECUTE ON FUNCTION public.create_chip_load(BIGINT, NUMERIC) TO anon;

COMMIT;
