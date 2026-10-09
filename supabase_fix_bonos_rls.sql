-- Desarrollo: la app usa la clave anon y no tiene autenticación.
-- Ejecutar en Supabase SQL Editor si Configuración > Bonos devuelve
-- "new row violates row-level security policy".

BEGIN;

ALTER TABLE public.condiciones_bono ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_estado ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dev_read_condiciones_bono ON public.condiciones_bono;
CREATE POLICY dev_read_condiciones_bono ON public.condiciones_bono
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS dev_insert_condiciones_bono ON public.condiciones_bono;
CREATE POLICY dev_insert_condiciones_bono ON public.condiciones_bono
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS dev_update_condiciones_bono ON public.condiciones_bono;
CREATE POLICY dev_update_condiciones_bono ON public.condiciones_bono
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS dev_delete_condiciones_bono ON public.condiciones_bono;
CREATE POLICY dev_delete_condiciones_bono ON public.condiciones_bono
  FOR DELETE TO anon
  USING (true);

DROP POLICY IF EXISTS dev_read_tipos_estado ON public.tipos_estado;
CREATE POLICY dev_read_tipos_estado ON public.tipos_estado
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS dev_insert_tipos_estado ON public.tipos_estado;
CREATE POLICY dev_insert_tipos_estado ON public.tipos_estado
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS dev_update_tipos_estado ON public.tipos_estado;
CREATE POLICY dev_update_tipos_estado ON public.tipos_estado
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS dev_delete_tipos_estado ON public.tipos_estado;
CREATE POLICY dev_delete_tipos_estado ON public.tipos_estado
  FOR DELETE TO anon
  USING (true);

COMMIT;
