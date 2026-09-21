-- SOLO DESARROLLO
-- La app actual no tiene autenticación, por eso usa el rol anon.
-- Estas políticas permiten probarla con la clave anon pública.
-- Antes de usar datos reales, reemplazalas por políticas para authenticated.

BEGIN;

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
ALTER TABLE publicidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_bonos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonos ENABLE ROW LEVEL SECURITY;
ALTER TABLE propinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_logistica ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE nombres_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE telefonos_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE titulares_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE paneles_x_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE paneles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subobjetivos_x_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE subobjetivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE objetivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas ENABLE ROW LEVEL SECURITY;
ALTER TABLE plataformas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargas_fichas ENABLE ROW LEVEL SECURITY;

-- Lectura pública temporal para la app sin login.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'cajas', 'turnos', 'dias_turno', 'tipos_turno', 'colores', 'tipos_billetera', 'tipos_cuenta',
    'cuentas_x_turno', 'cuentas', 'titulares', 'billeteras', 'titulares_x_caja', 'billeteras_x_caja', 'cuentas_x_caja',
    'lineas_publicidad', 'publicidad', 'lineas_bonos', 'bonos',
    'propinas', 'gastos', 'tipos_gasto', 'lineas_logistica', 'logistica',
    'usuarios', 'nombres_usuario', 'telefonos_usuario', 'titulares_usuario',
    'paneles_x_usuario', 'paneles', 'subobjetivos_x_turno', 'subobjetivos',
    'objetivos', 'fichas', 'plataformas', 'cargas_fichas'
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
    'colores', 'tipos_billetera', 'tipos_cuenta', 'cajas', 'billeteras', 'titulares',
    'titulares_x_caja', 'billeteras_x_caja', 'tipos_turno', 'dias_turno', 'turnos',
    'cuentas', 'cuentas_x_caja', 'cuentas_x_turno', 'publicidad', 'lineas_publicidad', 'bonos', 'lineas_bonos', 'logistica', 'propinas', 'gastos'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS dev_insert_%I ON public.%I', table_name, table_name);
    EXECUTE format('CREATE POLICY dev_insert_%I ON public.%I FOR INSERT TO anon WITH CHECK (true)', table_name, table_name);
  END LOOP;
END $$;

-- Escrituras mínimas usadas por los controles actuales.
DROP POLICY IF EXISTS dev_update_turnos ON public.turnos;
CREATE POLICY dev_update_turnos ON public.turnos
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS dev_update_cuentas_x_turno ON public.cuentas_x_turno;
CREATE POLICY dev_update_cuentas_x_turno ON public.cuentas_x_turno
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS dev_update_lineas_publicidad ON public.lineas_publicidad;
CREATE POLICY dev_update_lineas_publicidad ON public.lineas_publicidad
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

COMMIT;

-- Verificación usando SQL Editor.
SELECT id, nombre FROM cajas ORDER BY id;
SELECT id, abierto, caja_id, dia_turno_id FROM turnos ORDER BY id;
