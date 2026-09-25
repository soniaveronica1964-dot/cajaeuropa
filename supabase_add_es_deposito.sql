-- Migración para agregar el check "Depósito" a tipos_cuenta.
-- Ejecutar en Supabase SQL Editor sobre una base que ya contiene tipos_cuenta.

ALTER TABLE tipos_cuenta
    ADD COLUMN IF NOT EXISTS es_deposito BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE tipos_cuenta
    ADD COLUMN IF NOT EXISTS is_off BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE tipos_billetera
    ADD COLUMN IF NOT EXISTS is_off BOOLEAN NOT NULL DEFAULT FALSE;

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