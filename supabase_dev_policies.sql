-- SOLO DESARROLLO
-- La app actual no tiene autenticación, por eso usa el rol anon.
-- Estas políticas permiten probarla con la clave anon pública.
-- Antes de usar datos reales, reemplazalas por políticas para authenticated.

BEGIN;

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS turno_destino_id BIGINT
  REFERENCES public.turnos(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_movimientos_turno_destino
  ON public.movimientos(turno_destino_id);

-- Tablas que la interfaz consulta.
ALTER TABLE cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE dias_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE colores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_billetera ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_cuenta ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_x_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE titulares ENABLE ROW LEVEL SECURITY;
ALTER TABLE billeteras ENABLE ROW LEVEL SECURITY;
ALTER TABLE titulares_x_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE billeteras_x_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_x_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_publicidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_publicidad_x_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE publicidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_bonos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonos ENABLE ROW LEVEL SECURITY;
ALTER TABLE propinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargas_ta ENABLE ROW LEVEL SECURITY;
ALTER TABLE dinero_encontrado ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_logistica ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE nombres_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE telefonos_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE titulares_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE paneles_x_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE paneles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_x_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE subplataformas_x_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE subobjetivos_x_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE subobjetivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE objetivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas ENABLE ROW LEVEL SECURITY;
ALTER TABLE plataformas ENABLE ROW LEVEL SECURITY;
ALTER TABLE subplataformas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargas_fichas ENABLE ROW LEVEL SECURITY;
ALTER TABLE condiciones_bono ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_estado ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_estado ENABLE ROW LEVEL SECURITY;

-- Lectura pública temporal para la app sin login.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'cajas', 'turnos', 'dias_turno', 'tipos_turno', 'colores', 'tipos_billetera', 'tipos_cuenta',
    'cuentas_x_turno', 'cuentas', 'titulares', 'billeteras', 'titulares_x_caja', 'billeteras_x_caja', 'cuentas_x_caja',
    'lineas_publicidad', 'lineas_publicidad_x_caja', 'publicidad', 'lineas_bonos', 'bonos',
    'propinas', 'cargas_ta', 'dinero_encontrado', 'gastos', 'movimientos', 'notas_turno', 'tipos_gasto', 'lineas_logistica', 'logistica',
    'usuarios', 'nombres_usuario', 'telefonos_usuario', 'titulares_usuario',
    'paneles_x_usuario', 'paneles', 'categorias_usuario', 'categorias_x_usuario', 'subplataformas_x_usuario', 'subobjetivos_x_turno', 'subobjetivos',
    'objetivos', 'fichas', 'plataformas', 'subplataformas', 'cargas_fichas', 'condiciones_bono', 'tipos_estado',
    'estados', 'lineas_estado', 'app_config'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS dev_read_%I ON public.%I', table_name, table_name);
    EXECUTE format('CREATE POLICY dev_read_%I ON public.%I FOR SELECT TO anon USING (true)', table_name, table_name);
  END LOOP;
END $$;

-- Inserción temporal para el asistente de primer acceso.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'colores', 'tipos_billetera', 'tipos_cuenta', 'tipos_gasto', 'cajas', 'billeteras', 'titulares',
    'titulares_x_caja', 'billeteras_x_caja', 'tipos_turno', 'dias_turno', 'turnos',
    'cuentas', 'cuentas_x_caja', 'cuentas_x_turno', 'publicidad', 'lineas_publicidad', 'lineas_publicidad_x_caja', 'bonos', 'lineas_bonos', 'logistica', 'propinas', 'cargas_ta', 'dinero_encontrado', 'gastos', 'notas_turno', 'condiciones_bono', 'tipos_estado', 'estados', 'lineas_estado', 'subplataformas',
    'usuarios', 'nombres_usuario', 'telefonos_usuario', 'titulares_usuario', 'paneles_x_usuario', 'subplataformas_x_usuario', 'paneles', 'categorias_usuario', 'categorias_x_usuario'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS dev_insert_%I ON public.%I', table_name, table_name);
    EXECUTE format('CREATE POLICY dev_insert_%I ON public.%I FOR INSERT TO anon WITH CHECK (true)', table_name, table_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS dev_insert_fichas ON public.fichas;
CREATE POLICY dev_insert_fichas ON public.fichas
  FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.turnos AS shifts
      JOIN public.plataformas AS platforms
        ON platforms.caja_id = shifts.caja_id
      WHERE shifts.id = fichas.turno_id
        AND platforms.id = fichas.plataforma_id
    )
  );

-- Las líneas de logística solo pueden agregarse a cuentas del turno abierto.
DROP POLICY IF EXISTS dev_insert_lineas_logistica ON public.lineas_logistica;
CREATE POLICY dev_insert_lineas_logistica ON public.lineas_logistica
  FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.logistica AS logistics
      JOIN public.turnos AS shifts
        ON shifts.id = logistics.turno_id
      JOIN public.cuentas_x_turno AS account_links
        ON account_links.turno_id = shifts.id
      WHERE logistics.id = lineas_logistica.logistica_id
        AND account_links.id = lineas_logistica.cuenta_x_turno_id
        AND shifts.abierto IS TRUE
    )
  );

-- Escrituras mínimas usadas por los controles actuales.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'cajas', 'turnos', 'dias_turno', 'tipos_turno', 'colores', 'tipos_billetera', 'tipos_cuenta',
    'cuentas_x_turno', 'cuentas', 'titulares', 'billeteras', 'titulares_x_caja', 'billeteras_x_caja',
    'cuentas_x_caja', 'lineas_publicidad', 'lineas_publicidad_x_caja', 'publicidad', 'lineas_bonos', 'bonos',
    'propinas', 'cargas_ta', 'dinero_encontrado', 'gastos', 'notas_turno', 'tipos_gasto', 'lineas_logistica', 'logistica', 'usuarios',
    'nombres_usuario', 'telefonos_usuario', 'titulares_usuario', 'paneles_x_usuario', 'paneles', 'categorias_usuario', 'categorias_x_usuario', 'subplataformas_x_usuario',
    'subobjetivos_x_turno', 'subobjetivos', 'objetivos', 'fichas', 'plataformas', 'cargas_fichas',
    'condiciones_bono', 'app_config', 'tipos_estado', 'estados', 'lineas_estado', 'subplataformas'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS dev_update_%I ON public.%I', table_name, table_name);
    EXECUTE format('CREATE POLICY dev_update_%I ON public.%I FOR UPDATE TO anon USING (true) WITH CHECK (true)', table_name, table_name);

    EXECUTE format('DROP POLICY IF EXISTS dev_delete_%I ON public.%I', table_name, table_name);
    EXECUTE format('CREATE POLICY dev_delete_%I ON public.%I FOR DELETE TO anon USING (true)', table_name, table_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS dev_insert_movimientos ON public.movimientos;
CREATE POLICY dev_insert_movimientos ON public.movimientos
  FOR INSERT TO anon
  WITH CHECK (
    monto > 0
    AND caja_desde_id <> caja_hasta_id
    AND EXISTS (
      SELECT 1
      FROM public.turnos AS origin_shift
      JOIN public.cuentas_x_turno AS account_links
        ON account_links.turno_id = origin_shift.id
      WHERE origin_shift.id = movimientos.turno_id
        AND origin_shift.abierto IS TRUE
        AND account_links.id = movimientos.cuenta_x_turno_id
        AND (
          (
            movimientos.es_ahorro IS FALSE
            AND movimientos.turno_destino_id IS NOT NULL
            AND movimientos.caja_desde_id = origin_shift.caja_id
            AND EXISTS (
              SELECT 1
              FROM public.turnos AS destination_shift
              WHERE destination_shift.id = movimientos.turno_destino_id
                AND destination_shift.abierto IS TRUE
                AND destination_shift.id <> origin_shift.id
                AND destination_shift.caja_id = movimientos.caja_hasta_id
            )
          )
          OR (
            movimientos.es_ahorro IS TRUE
            AND movimientos.turno_destino_id IS NULL
            AND (
              movimientos.caja_desde_id = origin_shift.caja_id
              OR movimientos.caja_hasta_id = origin_shift.caja_id
            )
          )
        )
    )
  );

GRANT SELECT, INSERT ON public.movimientos TO anon;
GRANT SELECT ON public.turnos, public.cuentas_x_turno TO anon;

-- Bucket público para la imagen original y la miniatura de la aplicación.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-assets',
  'app-assets',
  TRUE,
  52428800,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif', 'image/bmp', 'image/tiff']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS dev_app_assets_read ON storage.objects;
CREATE POLICY dev_app_assets_read ON storage.objects
  FOR SELECT TO anon
  USING (
    bucket_id = 'app-assets'
    AND (
      name IN ('app-config/application-original', 'app-config/application-mini.webp')
      OR name LIKE 'estados/%'
    )
  );

DROP POLICY IF EXISTS dev_app_assets_insert ON storage.objects;
CREATE POLICY dev_app_assets_insert ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'app-assets'
    AND (
      name IN ('app-config/application-original', 'app-config/application-mini.webp')
      OR name LIKE 'estados/%'
    )
  );

DROP POLICY IF EXISTS dev_app_assets_update ON storage.objects;
CREATE POLICY dev_app_assets_update ON storage.objects
  FOR UPDATE TO anon
  USING (
    bucket_id = 'app-assets'
    AND (
      name IN ('app-config/application-original', 'app-config/application-mini.webp')
      OR name LIKE 'estados/%'
    )
  )
  WITH CHECK (
    bucket_id = 'app-assets'
    AND (
      name IN ('app-config/application-original', 'app-config/application-mini.webp')
      OR name LIKE 'estados/%'
    )
  );

DROP POLICY IF EXISTS dev_app_assets_delete ON storage.objects;
CREATE POLICY dev_app_assets_delete ON storage.objects
  FOR DELETE TO anon
  USING (
    bucket_id = 'app-assets'
    AND (
      name IN ('app-config/application-original', 'app-config/application-mini.webp')
      OR name LIKE 'estados/%'
    )
  );

COMMIT;

-- Verificación usando SQL Editor.
SELECT id, nombre FROM cajas ORDER BY id;
SELECT id, abierto, caja_id, dia_turno_id FROM turnos ORDER BY id;
