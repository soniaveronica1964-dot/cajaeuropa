ALTER TABLE cuentas_x_turno
    ALTER COLUMN caja_id DROP NOT NULL;

UPDATE cuentas_x_turno AS cxt
SET caja_id = NULL
WHERE cxt.turno_id IN (
    SELECT t.id
    FROM turnos AS t
    WHERE t.abierto IS TRUE
)
AND cxt.cuenta_id IN (
    SELECT c.id
    FROM cuentas AS c
    JOIN tipos_cuenta AS tc ON tc.id = c.tipo_cuenta_id
    WHERE tc.es_compartido IS TRUE
);
