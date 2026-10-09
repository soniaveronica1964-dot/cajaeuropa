-- Permisos de desarrollo para el catálogo de estados usado por el rol anon.
-- Ejecutar en Supabase SQL Editor al habilitar la pestaña Estados.

BEGIN;

ALTER TABLE public.estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineas_estado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subplataformas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plataformas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_estado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condiciones_bono ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS states_catalog_type_read ON public.tipos_estado;
CREATE POLICY states_catalog_type_read ON public.tipos_estado
  FOR SELECT TO anon
  USING (true);
DROP POLICY IF EXISTS states_catalog_condition_read ON public.condiciones_bono;
CREATE POLICY states_catalog_condition_read ON public.condiciones_bono
  FOR SELECT TO anon
  USING (true);
DROP POLICY IF EXISTS states_catalog_platform_read ON public.plataformas;
CREATE POLICY states_catalog_platform_read ON public.plataformas
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS states_catalog_read ON public.estados;
CREATE POLICY states_catalog_read ON public.estados
  FOR SELECT TO anon
  USING (true);
DROP POLICY IF EXISTS states_catalog_insert ON public.estados;
CREATE POLICY states_catalog_insert ON public.estados
  FOR INSERT TO anon
  WITH CHECK (true);
DROP POLICY IF EXISTS states_catalog_update ON public.estados;
CREATE POLICY states_catalog_update ON public.estados
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS states_catalog_delete ON public.estados;
CREATE POLICY states_catalog_delete ON public.estados
  FOR DELETE TO anon
  USING (true);

DROP POLICY IF EXISTS state_lines_catalog_read ON public.lineas_estado;
CREATE POLICY state_lines_catalog_read ON public.lineas_estado
  FOR SELECT TO anon
  USING (true);
DROP POLICY IF EXISTS state_lines_catalog_insert ON public.lineas_estado;
CREATE POLICY state_lines_catalog_insert ON public.lineas_estado
  FOR INSERT TO anon
  WITH CHECK (true);
DROP POLICY IF EXISTS state_lines_catalog_update ON public.lineas_estado;
CREATE POLICY state_lines_catalog_update ON public.lineas_estado
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS state_lines_catalog_delete ON public.lineas_estado;
CREATE POLICY state_lines_catalog_delete ON public.lineas_estado
  FOR DELETE TO anon
  USING (true);

DROP POLICY IF EXISTS state_subplatforms_catalog_read ON public.subplataformas;
CREATE POLICY state_subplatforms_catalog_read ON public.subplataformas
  FOR SELECT TO anon
  USING (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-assets',
  'app-assets',
  TRUE,
  52428800,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE;

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
