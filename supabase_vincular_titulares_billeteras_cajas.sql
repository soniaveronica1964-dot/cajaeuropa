BEGIN;

DO $$
DECLARE
  noruega_id BIGINT;
  suiza_id BIGINT;
  noruega_count INTEGER;
  suiza_count INTEGER;
BEGIN
  SELECT COUNT(*), MIN(id)
    INTO noruega_count, noruega_id
  FROM public.cajas
  WHERE LOWER(BTRIM(nombre)) = LOWER('Noruega');

  SELECT COUNT(*), MIN(id)
    INTO suiza_count, suiza_id
  FROM public.cajas
  WHERE LOWER(BTRIM(nombre)) = LOWER('Suiza');

  IF noruega_count <> 1 THEN
    RAISE EXCEPTION 'Se esperaba encontrar exactamente una caja llamada Noruega; se encontraron %', noruega_count;
  END IF;

  IF suiza_count <> 1 THEN
    RAISE EXCEPTION 'Se esperaba encontrar exactamente una caja llamada Suiza; se encontraron %', suiza_count;
  END IF;

  INSERT INTO public.titulares_x_caja (titular_id, caja_id)
  SELECT titulares.id, noruega_id
  FROM public.titulares AS titulares
  WHERE titulares.is_off IS FALSE
  ON CONFLICT (titular_id, caja_id) DO NOTHING;

  INSERT INTO public.billeteras_x_caja (billetera_id, caja_id)
  SELECT billeteras.id, cajas.id
  FROM public.billeteras AS billeteras
  CROSS JOIN (VALUES (suiza_id), (noruega_id)) AS cajas(id)
  WHERE billeteras.is_off IS FALSE
  ON CONFLICT (billetera_id, caja_id) DO NOTHING;

  INSERT INTO public.titulares_x_caja (titular_id, caja_id)
  SELECT DISTINCT cuentas.titular_id, suiza_id
  FROM public.cuentas AS cuentas
  JOIN public.tipos_cuenta AS tipos
    ON tipos.id = cuentas.tipo_cuenta_id
  WHERE tipos.es_compartido IS TRUE
  ON CONFLICT (titular_id, caja_id) DO NOTHING;
END
$$;

SELECT cajas.nombre AS caja, COUNT(DISTINCT titulares_x_caja.titular_id) AS titulares_vinculados
FROM public.cajas
LEFT JOIN public.titulares_x_caja
  ON titulares_x_caja.caja_id = cajas.id
WHERE LOWER(BTRIM(cajas.nombre)) IN (LOWER('Noruega'), LOWER('Suiza'))
GROUP BY cajas.id, cajas.nombre
ORDER BY cajas.nombre;

SELECT cajas.nombre AS caja, COUNT(DISTINCT billeteras_x_caja.billetera_id) AS billeteras_vinculadas
FROM public.cajas
LEFT JOIN public.billeteras_x_caja
  ON billeteras_x_caja.caja_id = cajas.id
WHERE LOWER(BTRIM(cajas.nombre)) IN (LOWER('Noruega'), LOWER('Suiza'))
GROUP BY cajas.id, cajas.nombre
ORDER BY cajas.nombre;

COMMIT;
