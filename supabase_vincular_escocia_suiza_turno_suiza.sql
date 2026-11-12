BEGIN;

DO $$
DECLARE
  suiza_box_id BIGINT;
  escocia_box_id BIGINT;
  suiza_shift_id BIGINT;
  target_box_ids BIGINT[];
  holder_ids BIGINT[];
  box_count INTEGER;
  shift_count INTEGER;
  holder_count INTEGER;
BEGIN
  SELECT COUNT(*), MIN(id)
    INTO box_count, suiza_box_id
  FROM public.cajas
  WHERE LOWER(BTRIM(nombre)) = LOWER('Suiza');

  IF box_count <> 1 THEN
    RAISE EXCEPTION 'Se esperaba encontrar exactamente una caja llamada Suiza; se encontraron %', box_count;
  END IF;

  SELECT COUNT(*), MIN(id)
    INTO box_count, escocia_box_id
  FROM public.cajas
  WHERE LOWER(BTRIM(nombre)) = LOWER('Escocia');

  IF box_count <> 1 THEN
    RAISE EXCEPTION 'Se esperaba encontrar exactamente una caja llamada Escocia; se encontraron %', box_count;
  END IF;

  SELECT COUNT(*), MIN(id)
    INTO shift_count, suiza_shift_id
  FROM public.turnos
  WHERE caja_id = suiza_box_id
    AND abierto IS TRUE;

  IF shift_count <> 1 THEN
    RAISE EXCEPTION 'Se esperaba encontrar exactamente un turno abierto para Suiza; se encontraron %', shift_count;
  END IF;

  SELECT COUNT(*), ARRAY_AGG(id ORDER BY id)
    INTO holder_count, holder_ids
  FROM public.titulares
  WHERE LOWER(BTRIM(nombre)) IN (LOWER('Escocia'), LOWER('Suiza'));

  IF holder_count <> 2 THEN
    RAISE EXCEPTION 'Se esperaban encontrar exactamente los titulares Escocia y Suiza; se encontraron %', holder_count;
  END IF;

  target_box_ids := ARRAY[escocia_box_id, suiza_box_id];

  INSERT INTO public.titulares_x_caja (titular_id, caja_id)
  SELECT holders.id, boxes.id
  FROM UNNEST(holder_ids) AS holders(id)
  CROSS JOIN UNNEST(target_box_ids) AS boxes(id)
  ON CONFLICT (titular_id, caja_id) DO NOTHING;

  INSERT INTO public.billeteras_x_caja (billetera_id, caja_id)
  SELECT DISTINCT accounts.billetera_id, boxes.id
  FROM public.cuentas AS accounts
  CROSS JOIN UNNEST(target_box_ids) AS boxes(id)
  WHERE accounts.titular_id = ANY(holder_ids)
  ON CONFLICT (billetera_id, caja_id) DO NOTHING;

  INSERT INTO public.cuentas_x_caja (cuenta_id, caja_id)
  SELECT accounts.id, boxes.id
  FROM public.cuentas AS accounts
  CROSS JOIN UNNEST(target_box_ids) AS boxes(id)
  WHERE accounts.titular_id = ANY(holder_ids)
  ON CONFLICT (cuenta_id, caja_id) DO NOTHING;

  INSERT INTO public.cuentas_x_turno (turno_id, cuenta_id, caja_id, valor, cobros, retiros)
  SELECT suiza_shift_id, accounts.id, suiza_box_id, 0, FALSE, FALSE
  FROM public.cuentas AS accounts
  JOIN public.tipos_cuenta AS account_types
    ON account_types.id = accounts.tipo_cuenta_id
  JOIN public.billeteras AS wallets
    ON wallets.id = accounts.billetera_id
  WHERE accounts.titular_id = ANY(holder_ids)
    AND accounts.activa IS TRUE
    AND account_types.es_deposito IS TRUE
    AND wallets.is_off IS FALSE
  ON CONFLICT (turno_id, cuenta_id, caja_id) DO NOTHING;
END
$$;

SELECT
  boxes.nombre AS caja,
  holders.nombre AS titular,
  accounts.id AS cuenta_id,
  wallets.nombre AS billetera,
  account_types.nombre AS tipo_cuenta,
  accounts.activa AS activa,
  (account_box_links.id IS NOT NULL) AS vinculada_a_caja
FROM public.cajas AS boxes
CROSS JOIN public.titulares AS holders
JOIN public.cuentas AS accounts
  ON accounts.titular_id = holders.id
JOIN public.billeteras AS wallets
  ON wallets.id = accounts.billetera_id
JOIN public.tipos_cuenta AS account_types
  ON account_types.id = accounts.tipo_cuenta_id
LEFT JOIN public.cuentas_x_caja AS account_box_links
  ON account_box_links.cuenta_id = accounts.id AND account_box_links.caja_id = boxes.id
WHERE LOWER(BTRIM(boxes.nombre)) IN (LOWER('Escocia'), LOWER('Suiza'))
  AND LOWER(BTRIM(holders.nombre)) IN (LOWER('Escocia'), LOWER('Suiza'))
ORDER BY boxes.nombre, holders.nombre, wallets.nombre, accounts.id;

SELECT
  COUNT(*) AS cuentas_deposito_en_turno_abierto_suiza
FROM public.cuentas_x_turno AS account_shifts
JOIN public.turnos AS shifts
  ON shifts.id = account_shifts.turno_id
JOIN public.cuentas AS accounts
  ON accounts.id = account_shifts.cuenta_id
JOIN public.titulares AS holders
  ON holders.id = accounts.titular_id
JOIN public.tipos_cuenta AS account_types
  ON account_types.id = accounts.tipo_cuenta_id
WHERE shifts.abierto IS TRUE
  AND LOWER(BTRIM(holders.nombre)) IN (LOWER('Escocia'), LOWER('Suiza'))
  AND account_types.es_deposito IS TRUE;

COMMIT;
