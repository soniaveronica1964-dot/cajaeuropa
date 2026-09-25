-- Migración para agregar el check "Depósito" a tipos_cuenta.
-- Ejecutar en Supabase SQL Editor sobre una base que ya contiene tipos_cuenta.

ALTER TABLE tipos_cuenta
    ADD COLUMN IF NOT EXISTS es_deposito BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE tipos_cuenta
    ADD COLUMN IF NOT EXISTS is_off BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE tipos_billetera
    ADD COLUMN IF NOT EXISTS is_off BOOLEAN NOT NULL DEFAULT FALSE;

-- Permisos temporales para que el asistente de alta pueda crear app_config
-- cuando se usa el rol anon en el entorno de desarrollo.
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dev_read_app_config ON public.app_config;
CREATE POLICY dev_read_app_config ON public.app_config
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS dev_insert_app_config ON public.app_config;
CREATE POLICY dev_insert_app_config ON public.app_config
    FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS dev_update_app_config ON public.app_config;
CREATE POLICY dev_update_app_config ON public.app_config
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS dev_delete_app_config ON public.app_config;
CREATE POLICY dev_delete_app_config ON public.app_config
    FOR DELETE TO anon, authenticated USING (true);

-- Solo para el entorno de desarrollo. Elimina todos los datos de la app
-- y reinicia las identidades para que los nuevos IDs vuelvan a comenzar en 1.
CREATE OR REPLACE FUNCTION public.format_caja_database()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    TRUNCATE TABLE
        historial_vigencias,
        subobjetivos_x_turno,
        subobjetivos,
        subplataformas_x_objetivo,
        objetivos_x_tipo_turno,
        objetivos_x_caja,
        objetivos,
        lineas_estado,
        estados,
        tipos_estado,
        condiciones_bono,
        cargas_fichas,
        fichas,
        subplataformas_x_usuario,
        categorias_x_usuario,
        categorias_usuario,
        paneles_x_usuario,
        paneles,
        titulares_usuario,
        telefonos_usuario,
        nombres_usuario,
        usuarios_vinculados,
        usuarios,
        lineas_logistica,
        logistica,
        lineas_bonos,
        bonos,
        lineas_publicidad_x_caja,
        lineas_publicidad,
        publicidad,
        movimientos,
        dinero_encontrado,
        gastos,
        notas_turno,
        propinas,
        cargas_ta,
        cuentas_x_turno,
        cuentas_x_caja,
        cuentas,
        turnos,
        dias_turno,
        tipos_turno,
        billeteras_x_caja,
        titulares_x_caja,
        billeteras,
        titulares,
        cajas,
        plataformas,
        tipos_cuenta,
        tipos_billetera,
        tipos_gasto,
        colores,
        cajeros,
        asignaciones_cajero,
        excepciones_cajero,
        app_config
    RESTART IDENTITY CASCADE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.format_caja_database() TO anon, authenticated;