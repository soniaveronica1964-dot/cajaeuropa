-- Configuración de desarrollo para Estados y sus catálogos.
-- La app usa el rol anon porque todavía no tiene autenticación.
-- Se puede volver a ejecutar: las políticas y la constraint se reemplazan
-- por nombre, y los cambios de esquema mantienen el mismo resultado.

BEGIN;

-- Normaliza la cantidad de porcentajes y mantiene su restricción.
ALTER TABLE public.tipos_estado
  DROP CONSTRAINT IF EXISTS tipos_estado_cantidad_porcentaje_check,
  DROP CONSTRAINT IF EXISTS chk_tipos_estado_cantidad_porcentaje;

ALTER TABLE public.tipos_estado
  ALTER COLUMN cantidad_porcentaje TYPE INTEGER
    USING GREATEST(0, ROUND(COALESCE(cantidad_porcentaje, 1)))::INTEGER,
  ALTER COLUMN cantidad_porcentaje SET DEFAULT 1,
  ALTER COLUMN cantidad_porcentaje SET NOT NULL;

ALTER TABLE public.tipos_estado
  ADD CONSTRAINT chk_tipos_estado_cantidad_porcentaje
  CHECK (cantidad_porcentaje >= 0);

-- Las condiciones sin plataforma permiten líneas sin subplataforma asociada.
ALTER TABLE public.lineas_estado
  ALTER COLUMN subplataforma_id DROP NOT NULL;

ALTER TABLE public.estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineas_estado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_estado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condiciones_bono ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subplataformas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plataformas ENABLE ROW LEVEL SECURITY;

-- Limpia los nombres históricos de las políticas específicas de Bonos.
DROP POLICY IF EXISTS dev_read_condiciones_bono ON public.condiciones_bono;
DROP POLICY IF EXISTS dev_insert_condiciones_bono ON public.condiciones_bono;
DROP POLICY IF EXISTS dev_update_condiciones_bono ON public.condiciones_bono;
DROP POLICY IF EXISTS dev_delete_condiciones_bono ON public.condiciones_bono;
DROP POLICY IF EXISTS dev_read_tipos_estado ON public.tipos_estado;
DROP POLICY IF EXISTS dev_insert_tipos_estado ON public.tipos_estado;
DROP POLICY IF EXISTS dev_update_tipos_estado ON public.tipos_estado;
DROP POLICY IF EXISTS dev_delete_tipos_estado ON public.tipos_estado;

DROP POLICY IF EXISTS states_catalog_type_read ON public.tipos_estado;
DROP POLICY IF EXISTS states_catalog_condition_read ON public.condiciones_bono;
DROP POLICY IF EXISTS states_catalog_platform_read ON public.plataformas;

DROP POLICY IF EXISTS states_catalog_read ON public.estados;
CREATE POLICY states_catalog_read ON public.estados
  FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS states_catalog_insert ON public.estados;
CREATE POLICY states_catalog_insert ON public.estados
  FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS states_catalog_update ON public.estados;
CREATE POLICY states_catalog_update ON public.estados
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS states_catalog_delete ON public.estados;
CREATE POLICY states_catalog_delete ON public.estados
  FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS state_lines_catalog_read ON public.lineas_estado;
CREATE POLICY state_lines_catalog_read ON public.lineas_estado
  FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS state_lines_catalog_insert ON public.lineas_estado;
CREATE POLICY state_lines_catalog_insert ON public.lineas_estado
  FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS state_lines_catalog_update ON public.lineas_estado;
CREATE POLICY state_lines_catalog_update ON public.lineas_estado
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS state_lines_catalog_delete ON public.lineas_estado;
CREATE POLICY state_lines_catalog_delete ON public.lineas_estado
  FOR DELETE TO anon USING (true);

CREATE POLICY states_catalog_type_read ON public.tipos_estado
  FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS states_catalog_type_insert ON public.tipos_estado;
CREATE POLICY states_catalog_type_insert ON public.tipos_estado
  FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS states_catalog_type_update ON public.tipos_estado;
CREATE POLICY states_catalog_type_update ON public.tipos_estado
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS states_catalog_type_delete ON public.tipos_estado;
CREATE POLICY states_catalog_type_delete ON public.tipos_estado
  FOR DELETE TO anon USING (true);

CREATE POLICY states_catalog_condition_read ON public.condiciones_bono
  FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS states_catalog_condition_insert ON public.condiciones_bono;
CREATE POLICY states_catalog_condition_insert ON public.condiciones_bono
  FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS states_catalog_condition_update ON public.condiciones_bono;
CREATE POLICY states_catalog_condition_update ON public.condiciones_bono
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS states_catalog_condition_delete ON public.condiciones_bono;
CREATE POLICY states_catalog_condition_delete ON public.condiciones_bono
  FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS state_subplatforms_catalog_read ON public.subplataformas;
CREATE POLICY state_subplatforms_catalog_read ON public.subplataformas
  FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS state_subplatforms_catalog_insert ON public.subplataformas;
CREATE POLICY state_subplatforms_catalog_insert ON public.subplataformas
  FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS state_subplatforms_catalog_update ON public.subplataformas;
CREATE POLICY state_subplatforms_catalog_update ON public.subplataformas
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS state_subplatforms_catalog_delete ON public.subplataformas;
CREATE POLICY state_subplatforms_catalog_delete ON public.subplataformas
  FOR DELETE TO anon USING (true);
CREATE POLICY states_catalog_platform_read ON public.plataformas
  FOR SELECT TO anon USING (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-assets',
  'app-assets',
  TRUE,
  52428800,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

DROP POLICY IF EXISTS states_catalog_assets_read ON storage.objects;
CREATE POLICY states_catalog_assets_read ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'app-assets' AND name LIKE 'estados/%');
DROP POLICY IF EXISTS states_catalog_assets_insert ON storage.objects;
CREATE POLICY states_catalog_assets_insert ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'app-assets' AND name LIKE 'estados/%');
DROP POLICY IF EXISTS states_catalog_assets_update ON storage.objects;
CREATE POLICY states_catalog_assets_update ON storage.objects
  FOR UPDATE TO anon
  USING (bucket_id = 'app-assets' AND name LIKE 'estados/%')
  WITH CHECK (bucket_id = 'app-assets' AND name LIKE 'estados/%');
DROP POLICY IF EXISTS states_catalog_assets_delete ON storage.objects;
CREATE POLICY states_catalog_assets_delete ON storage.objects
  FOR DELETE TO anon
  USING (bucket_id = 'app-assets' AND name LIKE 'estados/%');

COMMIT;
