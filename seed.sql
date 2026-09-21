-- Datos mínimos de prueba para Caja.
-- Ejecutar después de referencia.sql desde Supabase SQL Editor.
-- Es seguro volver a ejecutarlo: busca registros existentes por nombre y reutiliza los abiertos.

BEGIN;

-- Catálogos mínimos.
INSERT INTO colores (nombre, hex)
SELECT 'Violeta Caja', '#C7A0FF'
WHERE NOT EXISTS (SELECT 1 FROM colores WHERE nombre = 'Violeta Caja');

INSERT INTO tipos_billetera (nombre, cobros, retiros)
SELECT 'Cobros y retiros', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM tipos_billetera WHERE nombre = 'Cobros y retiros');

INSERT INTO tipos_cuenta (nombre, cobros, retiros, ahorro)
SELECT 'Cuenta operativa', TRUE, TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM tipos_cuenta WHERE nombre = 'Cuenta operativa');

INSERT INTO tipos_gasto (nombre, invertir_signo)
SELECT 'Adelanto', FALSE
WHERE NOT EXISTS (SELECT 1 FROM tipos_gasto WHERE nombre = 'Adelanto');

INSERT INTO condiciones_bono (nombre, plataforma)
SELECT 'Regular', FALSE
WHERE NOT EXISTS (SELECT 1 FROM condiciones_bono WHERE nombre = 'Regular');

INSERT INTO tipos_estado (nombre, cantidad_porcentaje)
SELECT 'Regular', 100
WHERE NOT EXISTS (SELECT 1 FROM tipos_estado WHERE nombre = 'Regular');

-- Caja demo.
INSERT INTO cajas (nombre, color_id, es_publicidad)
SELECT 'Noruega', c.id, FALSE
FROM colores c
WHERE c.nombre = 'Violeta Caja'
  AND NOT EXISTS (SELECT 1 FROM cajas WHERE nombre = 'Noruega');

-- Billeteras visibles en la matriz.
INSERT INTO billeteras (nombre, orden_num, tipo_billetera_id)
SELECT source.nombre, source.orden_num, tb.id
FROM (VALUES
  ('Ualá', 1),
  ('Mercado Pago', 2),
  ('Personal Pay', 3),
  ('Naranja X', 4),
  ('Prex', 5),
  ('Lemon', 6)
) AS source(nombre, orden_num)
CROSS JOIN (SELECT id FROM tipos_billetera WHERE nombre = 'Cobros y retiros' LIMIT 1) tb
WHERE NOT EXISTS (
  SELECT 1 FROM billeteras b WHERE b.nombre = source.nombre
);

INSERT INTO titulares (nombre, orden_num)
SELECT source.nombre, source.orden_num
FROM (VALUES
  ('Fede Acuña', 1),
  ('Pablo Totaro', 2),
  ('Mateo Ferrer', 3),
  ('Ever Lombardo', 4)
) AS source(nombre, orden_num)
WHERE NOT EXISTS (
  SELECT 1 FROM titulares t WHERE t.nombre = source.nombre
);

-- Vinculación de titulares y billeteras a la caja.
INSERT INTO titulares_x_caja (titular_id, caja_id)
SELECT t.id, c.id
FROM titulares t
CROSS JOIN cajas c
WHERE c.nombre = 'Noruega'
  AND t.nombre IN ('Fede Acuña', 'Pablo Totaro', 'Mateo Ferrer', 'Ever Lombardo')
  AND NOT EXISTS (
    SELECT 1 FROM titulares_x_caja txc
    WHERE txc.titular_id = t.id AND txc.caja_id = c.id
  );

INSERT INTO billeteras_x_caja (billetera_id, caja_id)
SELECT b.id, c.id
FROM billeteras b
CROSS JOIN cajas c
WHERE c.nombre = 'Noruega'
  AND b.nombre IN ('Ualá', 'Mercado Pago', 'Personal Pay', 'Naranja X', 'Prex', 'Lemon')
  AND NOT EXISTS (
    SELECT 1 FROM billeteras_x_caja bxc
    WHERE bxc.billetera_id = b.id AND bxc.caja_id = c.id
  );

-- Turno Noche: lunes de 00:00 a 08:00.
INSERT INTO tipos_turno (caja_id, nombre, color_id)
SELECT c.id, 'Turno Noche', color.id
FROM cajas c
CROSS JOIN (SELECT id FROM colores WHERE nombre = 'Violeta Caja' LIMIT 1) color
WHERE c.nombre = 'Noruega'
  AND NOT EXISTS (
    SELECT 1 FROM tipos_turno tt
    WHERE tt.caja_id = c.id AND tt.nombre = 'Turno Noche'
  );

INSERT INTO dias_turno (nombre, dia_semana, hora_inicio, hora_fin, cruza_medianoche, tipo_turno_id)
SELECT 'Noche lunes', 1, '00:00', '08:00', FALSE, tt.id
FROM tipos_turno tt
JOIN cajas c ON c.id = tt.caja_id
WHERE c.nombre = 'Noruega'
  AND tt.nombre = 'Turno Noche'
  AND NOT EXISTS (
    SELECT 1 FROM dias_turno dt
    WHERE dt.tipo_turno_id = tt.id AND dt.nombre = 'Noche lunes'
  );

-- El trigger fn_set_caja_id_turno completa caja_id según el día del turno.
INSERT INTO turnos (dia_turno_id, abierto, fecha_hora_inicio, caja_inicial, redondeo)
SELECT dt.id, TRUE, NOW(), 497553, -129
FROM dias_turno dt
JOIN tipos_turno tt ON tt.id = dt.tipo_turno_id
JOIN cajas c ON c.id = tt.caja_id
WHERE c.nombre = 'Noruega'
  AND dt.nombre = 'Noche lunes'
  AND NOT EXISTS (
    SELECT 1 FROM turnos t
    WHERE t.caja_id = c.id AND t.abierto
  );

-- Cuentas operativas y relación con la caja.
INSERT INTO cuentas (titular_id, billetera_id, alias, tipo_cuenta_id)
SELECT t.id, b.id, lower(replace(t.nombre, ' ', '.')) || '.' || lower(replace(b.nombre, ' ', '')), tc.id
FROM titulares t
CROSS JOIN billeteras b
CROSS JOIN (SELECT id FROM tipos_cuenta WHERE nombre = 'Cuenta operativa' LIMIT 1) tc
WHERE t.nombre IN ('Fede Acuña', 'Pablo Totaro', 'Mateo Ferrer', 'Ever Lombardo')
  AND b.nombre IN ('Ualá', 'Mercado Pago', 'Personal Pay', 'Naranja X', 'Prex', 'Lemon')
  AND NOT EXISTS (
    SELECT 1 FROM cuentas existing
    WHERE existing.titular_id = t.id AND existing.billetera_id = b.id
  );

INSERT INTO cuentas_x_caja (cuenta_id, caja_id)
SELECT cu.id, c.id
FROM cuentas cu
JOIN cajas c ON c.nombre = 'Noruega'
JOIN titulares t ON t.id = cu.titular_id
JOIN billeteras b ON b.id = cu.billetera_id
WHERE t.nombre IN ('Fede Acuña', 'Pablo Totaro', 'Mateo Ferrer', 'Ever Lombardo')
  AND b.nombre IN ('Ualá', 'Mercado Pago', 'Personal Pay', 'Naranja X', 'Prex', 'Lemon')
  AND NOT EXISTS (
    SELECT 1 FROM cuentas_x_caja existing
    WHERE existing.cuenta_id = cu.id AND existing.caja_id = c.id
  );

INSERT INTO cuentas_x_turno (turno_id, cuenta_id, caja_id, valor, cobros, retiros)
SELECT t.id, cxc.cuenta_id, cxc.caja_id, 0, TRUE, TRUE
FROM turnos t
JOIN cuentas_x_caja cxc ON cxc.caja_id = t.caja_id
WHERE t.abierto
  AND t.caja_id = (SELECT id FROM cajas WHERE nombre = 'Noruega' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM cuentas_x_turno existing
    WHERE existing.turno_id = t.id AND existing.cuenta_id = cxc.cuenta_id AND existing.caja_id = cxc.caja_id
  );

-- Registros únicos que alimentan los módulos del dashboard.
INSERT INTO publicidad (turno_id)
SELECT t.id
FROM turnos t
WHERE t.abierto
  AND NOT EXISTS (SELECT 1 FROM publicidad p WHERE p.turno_id = t.id);

INSERT INTO bonos (turno_id, total_otorgado, total_recuperado, total_publicidad, numero_bonos)
SELECT t.id, 0, 0, 0, 0
FROM turnos t
WHERE t.abierto
  AND NOT EXISTS (SELECT 1 FROM bonos b WHERE b.turno_id = t.id);

INSERT INTO logistica (turno_id)
SELECT t.id
FROM turnos t
WHERE t.abierto
  AND NOT EXISTS (SELECT 1 FROM logistica l WHERE l.turno_id = t.id);

COMMIT;

-- Comprobación rápida: debería devolver una fila.
SELECT t.id, t.abierto, c.nombre AS caja, dt.nombre AS dia_turno,
       dt.hora_inicio, dt.hora_fin, t.caja_inicial, t.redondeo
FROM turnos t
JOIN cajas c ON c.id = t.caja_id
JOIN dias_turno dt ON dt.id = t.dia_turno_id
WHERE t.abierto = TRUE
  AND c.nombre = 'Noruega';
