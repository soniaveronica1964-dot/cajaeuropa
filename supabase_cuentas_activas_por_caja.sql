BEGIN;

ALTER TABLE public.cuentas_x_caja
  ADD COLUMN IF NOT EXISTS activa BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.cuentas_x_caja AS account_boxes
SET activa = accounts.activa
FROM public.cuentas AS accounts
WHERE accounts.id = account_boxes.cuenta_id;

COMMIT;
