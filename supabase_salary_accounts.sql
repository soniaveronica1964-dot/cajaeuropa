-- Cuentas de sueldo separadas de las cuentas operativas y asociadas a cada turno.
CREATE TABLE IF NOT EXISTS public.titulares_sueldo (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    orden_num INTEGER,
    is_off BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (orden_num IS NULL OR orden_num > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_titulares_sueldo_nombre_activo
    ON public.titulares_sueldo (LOWER(TRIM(nombre)))
    WHERE is_off = FALSE;

CREATE TABLE IF NOT EXISTS public.cuentas_sueldo (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titular_sueldo_id BIGINT NOT NULL UNIQUE
        REFERENCES public.titulares_sueldo(id) ON DELETE CASCADE,
    alias TEXT NOT NULL DEFAULT '',
    cuil TEXT NOT NULL DEFAULT '',
    patron TEXT NOT NULL DEFAULT '',
    notas TEXT NOT NULL DEFAULT '',
    activa BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.cuentas_sueldo_x_turno (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    turno_id BIGINT NOT NULL REFERENCES public.turnos(id) ON DELETE CASCADE,
    cuenta_sueldo_id BIGINT NOT NULL REFERENCES public.cuentas_sueldo(id) ON DELETE CASCADE,
    valor NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
    UNIQUE (turno_id, cuenta_sueldo_id)
);

ALTER TABLE public.titulares_sueldo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_sueldo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_sueldo_x_turno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS salary_holders_select ON public.titulares_sueldo;
CREATE POLICY salary_holders_select ON public.titulares_sueldo
    FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS salary_holders_insert ON public.titulares_sueldo;
CREATE POLICY salary_holders_insert ON public.titulares_sueldo
    FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS salary_holders_update ON public.titulares_sueldo;
CREATE POLICY salary_holders_update ON public.titulares_sueldo
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS salary_holders_delete ON public.titulares_sueldo;
CREATE POLICY salary_holders_delete ON public.titulares_sueldo
    FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS salary_accounts_select ON public.cuentas_sueldo;
CREATE POLICY salary_accounts_select ON public.cuentas_sueldo
    FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS salary_accounts_insert ON public.cuentas_sueldo;
CREATE POLICY salary_accounts_insert ON public.cuentas_sueldo
    FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS salary_accounts_update ON public.cuentas_sueldo;
CREATE POLICY salary_accounts_update ON public.cuentas_sueldo
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS salary_accounts_delete ON public.cuentas_sueldo;
CREATE POLICY salary_accounts_delete ON public.cuentas_sueldo
    FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS salary_values_select ON public.cuentas_sueldo_x_turno;
CREATE POLICY salary_values_select ON public.cuentas_sueldo_x_turno
    FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS salary_values_insert_open_shift ON public.cuentas_sueldo_x_turno;
CREATE POLICY salary_values_insert_open_shift ON public.cuentas_sueldo_x_turno
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.turnos t
            WHERE t.id = turno_id AND t.abierto = TRUE
        )
        AND EXISTS (
            SELECT 1
            FROM public.cuentas_sueldo c
            JOIN public.titulares_sueldo h ON h.id = c.titular_sueldo_id
            WHERE c.id = cuenta_sueldo_id AND c.activa = TRUE AND h.is_off = FALSE
        )
    );
DROP POLICY IF EXISTS salary_values_update_open_shift ON public.cuentas_sueldo_x_turno;
CREATE POLICY salary_values_update_open_shift ON public.cuentas_sueldo_x_turno
    FOR UPDATE TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.turnos t
            WHERE t.id = turno_id AND t.abierto = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.turnos t
            WHERE t.id = turno_id AND t.abierto = TRUE
        )
    );
DROP POLICY IF EXISTS salary_values_delete_open_shift ON public.cuentas_sueldo_x_turno;
CREATE POLICY salary_values_delete_open_shift ON public.cuentas_sueldo_x_turno
    FOR DELETE TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.turnos t
            WHERE t.id = turno_id AND t.abierto = TRUE
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.titulares_sueldo,
    public.cuentas_sueldo,
    public.cuentas_sueldo_x_turno
TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE
    public.titulares_sueldo_id_seq,
    public.cuentas_sueldo_id_seq,
    public.cuentas_sueldo_x_turno_id_seq
TO anon, authenticated;

-- Keep the full database formatter aware of the new independent tables.
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
        cuentas_sueldo_x_turno,
        cuentas_sueldo,
        titulares_sueldo,
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
