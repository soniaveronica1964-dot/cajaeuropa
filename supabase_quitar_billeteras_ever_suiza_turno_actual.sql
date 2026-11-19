BEGIN;

DO $$
DECLARE
  suiza_id BIGINT;
  suiza_count INTEGER;
  shift_id BIGINT;
  shift_count INTEGER;
  removed_count INTEGER;
BEGIN
  SELECT COUNT(*), MIN(id)
    INTO suiza_count, suiza_id
  FROM public.cajas
  WHERE LOWER(BTRIM(nombre)) = LOWER('Suiza');

  IF suiza_count <> 1 THEN
    RAISE EXCEPTION 'Se esperaba encontrar exactamente una caja llamada Suiza; se encontraron %', suiza_count;
  END IF;

  SELECT COUNT(*), MIN(id)
    INTO shift_count, shift_id
  FROM public.turnos
  WHERE caja_id = suiza_id
    AND abierto IS TRUE;

  IF shift_count <> 1 THEN
    RAISE EXCEPTION 'Se esperaba encontrar exactamente un turno abierto para Suiza; se encontraron %', shift_count;
  END IF;

  DELETE FROM public.cuentas_x_turno AS account_shifts
  USING public.cuentas AS accounts,
        public.titulares AS holders,
        public.billeteras AS wallets,
        public.tipos_cuenta AS account_types
  WHERE account_shifts.turno_id = shift_id
    AND account_shifts.cuenta_id = accounts.id
    AND accounts.titular_id = holders.id
    AND accounts.billetera_id = wallets.id
    AND accounts.tipo_cuenta_id = account_types.id
    AND LOWER(BTRIM(holders.nombre)) = LOWER('Ever Lombardo')
    AND LOWER(BTRIM(wallets.nombre)) IN (
      LOWER('Uala'),
      LOWER('Ualá'),
      LOWER('Mercado Pago'),
      LOWER('Personal Pay'),
      LOWER('Naranja X')
    )
    AND account_types.es_compartido IS NOT TRUE
    AND account_types.ahorro IS NOT TRUE;

  GET DIAGNOSTICS removed_count = ROW_COUNT;
  RAISE NOTICE 'Se quitaron % billeteras operativas del turno abierto de Suiza.', removed_count;
END
$$;

COMMIT;
