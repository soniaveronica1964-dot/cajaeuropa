-- Ejecutar desde Supabase SQL Editor antes de usar "Reiniciar turnos".
-- Borra el historial operativo de una sola caja y crea un turno limpio
-- según el día configurado, sin heredar datos de turnos anteriores.

CREATE OR REPLACE FUNCTION public.reset_shift_history(
    p_box_id BIGINT,
    p_current_shift_id BIGINT,
    p_day_id BIGINT,
    p_started_at TIMESTAMPTZ
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    new_shift_id BIGINT;
    new_advertising_id BIGINT;
BEGIN
    IF p_box_id IS NULL OR p_current_shift_id IS NULL OR p_day_id IS NULL OR p_started_at IS NULL THEN
        RAISE EXCEPTION 'Faltan datos para reiniciar los turnos';
    END IF;

    PERFORM 1
    FROM public.cajas
    WHERE id = p_box_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La caja seleccionada no existe';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.turnos
        WHERE id = p_current_shift_id
          AND caja_id = p_box_id
          AND abierto = TRUE
    ) THEN
        RAISE EXCEPTION 'El turno abierto ya no corresponde a esta caja';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.dias_turno AS day
        JOIN public.tipos_turno AS shift_type ON shift_type.id = day.tipo_turno_id
        WHERE day.id = p_day_id
          AND shift_type.caja_id = p_box_id
    ) THEN
        RAISE EXCEPTION 'El turno configurado no pertenece a esta caja';
    END IF;

    -- Estas tablas tienen referencias restrictivas a cuentas_x_turno.
    DELETE FROM public.dinero_encontrado AS found
    WHERE found.cuenta_x_turno_id IN (
        SELECT account_shift.id
        FROM public.cuentas_x_turno AS account_shift
        JOIN public.turnos AS shift ON shift.id = account_shift.turno_id
        WHERE shift.caja_id = p_box_id
    );

    DELETE FROM public.lineas_logistica AS logistics_line
    WHERE logistics_line.cuenta_x_turno_id IN (
        SELECT account_shift.id
        FROM public.cuentas_x_turno AS account_shift
        JOIN public.turnos AS shift ON shift.id = account_shift.turno_id
        WHERE shift.caja_id = p_box_id
    );

    -- Un movimiento ligado a la caja reiniciada no puede conservar referencias
    -- a turnos/cuentas que se van a borrar, aunque su otro extremo sea otra caja.
    DELETE FROM public.movimientos AS movement
    WHERE movement.turno_id IN (
        SELECT id FROM public.turnos WHERE caja_id = p_box_id
    )
       OR movement.turno_destino_id IN (
        SELECT id FROM public.turnos WHERE caja_id = p_box_id
    )
       OR movement.cuenta_x_turno_id IN (
        SELECT account_shift.id
        FROM public.cuentas_x_turno AS account_shift
        JOIN public.turnos AS shift ON shift.id = account_shift.turno_id
        WHERE shift.caja_id = p_box_id
    );

    -- Los registros dependientes restantes se eliminan por ON DELETE CASCADE.
    DELETE FROM public.turnos
    WHERE caja_id = p_box_id;

    INSERT INTO public.turnos (
        dia_turno_id,
        abierto,
        fecha_hora_inicio,
        caja_inicial,
        redondeo
    )
    VALUES (p_day_id, TRUE, p_started_at, 0, 0)
    RETURNING id INTO new_shift_id;

    -- Igual que al abrir un turno normal: solo las cuentas activas, habilitadas
    -- en la caja y asociadas a billeteras activas de esa misma caja.
    INSERT INTO public.cuentas_x_turno (
        turno_id,
        cuenta_id,
        caja_id,
        valor,
        cobros,
        retiros
    )
    SELECT
        new_shift_id,
        account.id,
        p_box_id,
        0,
        FALSE,
        FALSE
    FROM public.cuentas_x_caja AS account_box
    JOIN public.cuentas AS account ON account.id = account_box.cuenta_id
    JOIN public.billeteras AS wallet ON wallet.id = account.billetera_id
    JOIN public.billeteras_x_caja AS wallet_box
      ON wallet_box.billetera_id = wallet.id
     AND wallet_box.caja_id = p_box_id
    WHERE account_box.caja_id = p_box_id
      AND account.activa = TRUE
      AND wallet.is_off = FALSE;

    INSERT INTO public.publicidad (turno_id)
    VALUES (new_shift_id)
    RETURNING id INTO new_advertising_id;

    INSERT INTO public.lineas_publicidad (publicidad_id)
    SELECT new_advertising_id
    FROM generate_series(1, 2);

    INSERT INTO public.fichas (
        fichas_inicial,
        fichas_final,
        turno_id,
        plataforma_id
    )
    SELECT 0, 0, new_shift_id, platform.id
    FROM public.plataformas AS platform
    WHERE platform.caja_id = p_box_id;

    RETURN new_shift_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_shift_history(BIGINT, BIGINT, BIGINT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_shift_history(BIGINT, BIGINT, BIGINT, TIMESTAMPTZ) TO anon, authenticated;
