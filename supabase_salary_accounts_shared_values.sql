BEGIN;

CREATE TABLE IF NOT EXISTS public.valores_sueldo_compartidos (
    cuenta_sueldo_id BIGINT PRIMARY KEY
        REFERENCES public.cuentas_sueldo(id) ON DELETE CASCADE,
    valor NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.valores_sueldo_compartidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shared_salary_values_select ON public.valores_sueldo_compartidos;
CREATE POLICY shared_salary_values_select ON public.valores_sueldo_compartidos
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS shared_salary_values_insert ON public.valores_sueldo_compartidos;
CREATE POLICY shared_salary_values_insert ON public.valores_sueldo_compartidos
    FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS shared_salary_values_update ON public.valores_sueldo_compartidos;
CREATE POLICY shared_salary_values_update ON public.valores_sueldo_compartidos
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS shared_salary_values_delete ON public.valores_sueldo_compartidos;
CREATE POLICY shared_salary_values_delete ON public.valores_sueldo_compartidos
    FOR DELETE TO anon, authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.valores_sueldo_compartidos
TO anon, authenticated;

INSERT INTO public.valores_sueldo_compartidos (cuenta_sueldo_id, valor, actualizado_en)
SELECT
    links.cuenta_sueldo_id,
    COALESCE((
        SELECT latest.valor
        FROM public.cuentas_sueldo_x_turno AS latest
        WHERE latest.cuenta_sueldo_id = links.cuenta_sueldo_id
        ORDER BY latest.id DESC
        LIMIT 1
    ), 0),
    NOW()
FROM (
    SELECT DISTINCT cuenta_sueldo_id
    FROM public.cuentas_sueldo_x_turno
) AS links
ON CONFLICT (cuenta_sueldo_id) DO NOTHING;

INSERT INTO public.valores_sueldo_compartidos (cuenta_sueldo_id, valor)
SELECT id, 0
FROM public.cuentas_sueldo
ON CONFLICT (cuenta_sueldo_id) DO NOTHING;

UPDATE public.cuentas_sueldo_x_turno AS links
SET valor = shared.valor
FROM public.valores_sueldo_compartidos AS shared
WHERE links.cuenta_sueldo_id = shared.cuenta_sueldo_id;

COMMIT;