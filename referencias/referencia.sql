-- =========================================================
-- 0. MOTOR DE VIGENCIA INTELIGENTE (GLOBAL)
-- =========================================================

-- Tabla centralizada de historial de activación/desactivación para TODO el sistema.
CREATE TABLE historial_vigencias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entidad VARCHAR(100) NOT NULL,       -- Nombre de la tabla (ej: 'colores', 'cajas', 'billeteras')
    registro_id BIGINT NOT NULL,         -- ID del registro en esa tabla
    fecha_hora_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_hora_fin TIMESTAMPTZ,          -- NULL significa que actualmente SÍ está activo
    
    CHECK (fecha_hora_fin IS NULL OR fecha_hora_fin >= fecha_hora_inicio)
);

-- Índices de alto rendimiento para consultas de estado actual e histórico
CREATE INDEX idx_historial_vigencias_entidad_reg 
    ON historial_vigencias(entidad, registro_id, fecha_hora_inicio DESC);

-- Índice único parcial crucial: Garantiza que un registro SOLO pueda tener un periodo abierto (activo) a la vez.
CREATE UNIQUE INDEX idx_unico_activo_por_entidad 
    ON historial_vigencias(entidad, registro_id) 
    WHERE fecha_hora_fin IS NULL;


-- =========================================================
-- 1. CONFIGURACIÓN Y CATÁLOGOS
-- =========================================================

CREATE TABLE app_config (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    icono VARCHAR(255),
    imagen TEXT,
    imagen_mini TEXT,
    tema BOOLEAN NOT NULL DEFAULT FALSE,
    ver_notas BOOLEAN NOT NULL DEFAULT TRUE,
    singleton BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_app_config_singleton CHECK (singleton),
    CONSTRAINT uq_app_config_singleton UNIQUE (singleton)
);

CREATE TABLE colores (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    hex VARCHAR(7) NOT NULL
        CHECK (hex ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE tipos_gasto (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    invertir_signo BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE tipos_billetera (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    cobros BOOLEAN NOT NULL DEFAULT FALSE,
    retiros BOOLEAN NOT NULL DEFAULT FALSE,
    is_off BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE tipos_cuenta (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    es_compartido BOOLEAN NOT NULL DEFAULT FALSE,
    es_deposito BOOLEAN NOT NULL DEFAULT FALSE,
    es_publicidad BOOLEAN NOT NULL DEFAULT FALSE,
    cobros BOOLEAN NOT NULL DEFAULT FALSE,
    retiros BOOLEAN NOT NULL DEFAULT FALSE,
    ahorro BOOLEAN NOT NULL DEFAULT FALSE,
    is_off BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE tipos_estado (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    cantidad_porcentaje NUMERIC(5,2)
        CHECK (cantidad_porcentaje BETWEEN 0 AND 100)
);

CREATE TABLE condiciones_bono (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    plataforma BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE titulares (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    orden_num INTEGER,
    is_off BOOLEAN NOT NULL DEFAULT FALSE,

    CHECK (orden_num IS NULL OR orden_num > 0)
);

CREATE TABLE billeteras (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    orden_num INTEGER,
    is_off BOOLEAN NOT NULL DEFAULT FALSE,
    tipo_billetera_id BIGINT NOT NULL
        REFERENCES tipos_billetera(id)
        ON DELETE RESTRICT,

    CHECK (orden_num IS NULL OR orden_num > 0)
);

CREATE UNIQUE INDEX idx_titulares_nombre_activo
    ON titulares (LOWER(TRIM(nombre)))
    WHERE is_off = FALSE;

CREATE UNIQUE INDEX idx_billeteras_nombre_activo
    ON billeteras (LOWER(TRIM(nombre)))
    WHERE is_off = FALSE;

CREATE UNIQUE INDEX idx_titulares_orden_activo
    ON titulares (orden_num)
    WHERE is_off = FALSE AND orden_num IS NOT NULL;

CREATE UNIQUE INDEX idx_billeteras_orden_activo
    ON billeteras (orden_num)
    WHERE is_off = FALSE AND orden_num IS NOT NULL;

CREATE TABLE cajas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    imagen TEXT,
    imagen_mini TEXT,
    color_id BIGINT REFERENCES colores(id)
        ON DELETE SET NULL,
    es_publicidad BOOLEAN NOT NULL DEFAULT FALSE
);

-- =========================================================
-- TABLAS DE CONFIGURACIÓN: TITULARES Y BILLETERAS POR CAJA
-- =========================================================

CREATE TABLE titulares_x_caja (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titular_id BIGINT NOT NULL REFERENCES titulares(id)
        ON DELETE CASCADE,
    caja_id BIGINT NOT NULL REFERENCES cajas(id)
        ON DELETE CASCADE,

    UNIQUE (titular_id, caja_id)
);

CREATE TABLE billeteras_x_caja (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    billetera_id BIGINT NOT NULL REFERENCES billeteras(id)
        ON DELETE CASCADE,
    caja_id BIGINT NOT NULL REFERENCES cajas(id)
        ON DELETE CASCADE,

    UNIQUE (billetera_id, caja_id)
);

CREATE TABLE tipos_turno (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    caja_id BIGINT NOT NULL REFERENCES cajas(id)
        ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    color_id BIGINT REFERENCES colores(id)
        ON DELETE SET NULL
);

CREATE TABLE dias_turno (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    dia_semana SMALLINT NOT NULL
        CHECK (dia_semana BETWEEN 1 AND 7),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    cruza_medianoche BOOLEAN NOT NULL DEFAULT FALSE,
    tipo_turno_id BIGINT NOT NULL REFERENCES tipos_turno(id)
        ON DELETE CASCADE,

    CHECK (
        (
            cruza_medianoche = FALSE
            AND hora_fin > hora_inicio
        )
        OR
        (
            cruza_medianoche = TRUE
            AND hora_fin <= hora_inicio
        )
    )
);

-- =========================================================
-- 2. TURNOS Y CAJAS
-- =========================================================

CREATE TABLE turnos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dia_turno_id BIGINT NOT NULL REFERENCES dias_turno(id)
        ON DELETE RESTRICT,
    caja_id BIGINT NOT NULL REFERENCES cajas(id)
        ON DELETE RESTRICT,
    abierto BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_hora_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_hora_fin TIMESTAMPTZ,
    caja_inicial NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (caja_inicial >= 0),
    caja_final NUMERIC(14,2)
        CHECK (caja_final >= 0),
    redondeo NUMERIC(14,2) NOT NULL DEFAULT 0,

    CHECK (
        fecha_hora_fin IS NULL
        OR fecha_hora_fin >= fecha_hora_inicio
    ),

    CONSTRAINT chk_turno_cerrado_completo CHECK (
        abierto = TRUE
        OR (fecha_hora_fin IS NOT NULL AND caja_final IS NOT NULL)
    )
);

CREATE OR REPLACE FUNCTION fn_set_caja_id_turno()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    SELECT tt.caja_id
    INTO NEW.caja_id
    FROM dias_turno dt
    JOIN tipos_turno tt ON tt.id = dt.tipo_turno_id
    WHERE dt.id = NEW.dia_turno_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_caja_id_turno
BEFORE INSERT OR UPDATE OF dia_turno_id ON turnos
FOR EACH ROW
EXECUTE FUNCTION fn_set_caja_id_turno();

CREATE UNIQUE INDEX idx_turno_unico_abierto_por_caja
    ON turnos(caja_id) WHERE abierto;

CREATE TABLE cuentas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titular_id BIGINT NOT NULL
        REFERENCES titulares(id)
        ON DELETE RESTRICT,
    billetera_id BIGINT NOT NULL
        REFERENCES billeteras(id)
        ON DELETE RESTRICT,
    alias VARCHAR(150),
    cuil VARCHAR(20),
    patron TEXT,
    notas TEXT,
    tipo_cuenta_id BIGINT NOT NULL REFERENCES tipos_cuenta(id)
        ON DELETE RESTRICT,
    activa BOOLEAN NOT NULL DEFAULT TRUE,

    UNIQUE (titular_id, billetera_id)
);

CREATE TABLE cuentas_x_caja (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cuenta_id BIGINT NOT NULL REFERENCES cuentas(id)
        ON DELETE CASCADE,
    caja_id BIGINT NOT NULL REFERENCES cajas(id)
        ON DELETE CASCADE,

    UNIQUE (cuenta_id, caja_id)
);

CREATE TABLE cuentas_x_turno (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    turno_id BIGINT NOT NULL REFERENCES turnos(id)
        ON DELETE CASCADE,
    cuenta_id BIGINT NOT NULL,
    caja_id BIGINT NOT NULL,
    valor NUMERIC(14,2) NOT NULL DEFAULT 0,
    cobros BOOLEAN NOT NULL DEFAULT FALSE,
    retiros BOOLEAN NOT NULL DEFAULT FALSE,

    UNIQUE (turno_id, cuenta_id, caja_id),

    FOREIGN KEY (cuenta_id, caja_id)
        REFERENCES cuentas_x_caja (cuenta_id, caja_id)
        ON DELETE RESTRICT
);

-- =========================================================
-- 3. MOVIMIENTOS OPERATIVOS
-- =========================================================

CREATE TABLE propinas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT,
    usuario_texto TEXT,
    monto NUMERIC(14,2) NOT NULL,
    notas TEXT,
    fecha_hora_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    turno_id BIGINT NOT NULL REFERENCES turnos(id)
        ON DELETE CASCADE
);

CREATE TABLE cargas_ta (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT,
    usuario_texto TEXT,
    monto NUMERIC(14,2) NOT NULL,
    notas TEXT,
    fecha_hora_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    turno_id BIGINT NOT NULL REFERENCES turnos(id)
        ON DELETE CASCADE
);

CREATE TABLE dinero_encontrado (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cuenta_x_turno_id BIGINT NOT NULL REFERENCES cuentas_x_turno(id)
        ON DELETE RESTRICT,
    monto NUMERIC(14,2) NOT NULL,
    notas TEXT,
    fecha_hora_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gastos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_gasto_id BIGINT NOT NULL REFERENCES tipos_gasto(id)
        ON DELETE RESTRICT,
    monto NUMERIC(14,2) NOT NULL,
    notas TEXT,
    fecha_hora_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    turno_id BIGINT NOT NULL REFERENCES turnos(id)
        ON DELETE CASCADE
);

CREATE TABLE notas_turno (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nota_general TEXT,
    nota_heredable TEXT,
    turno_id BIGINT NOT NULL REFERENCES turnos(id)
        ON DELETE CASCADE,

    UNIQUE (turno_id)
);

CREATE TABLE movimientos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    caja_desde_id BIGINT NOT NULL REFERENCES cajas(id)
        ON DELETE RESTRICT,
    caja_hasta_id BIGINT NOT NULL REFERENCES cajas(id)
        ON DELETE RESTRICT,
    fecha_hora_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    turno_id BIGINT NOT NULL REFERENCES turnos(id)
        ON DELETE CASCADE,
    monto NUMERIC(14,2) NOT NULL,
    es_ahorro BOOLEAN NOT NULL DEFAULT FALSE,
    cuenta_x_turno_id BIGINT NOT NULL REFERENCES cuentas_x_turno(id)
        ON DELETE RESTRICT,
    notas TEXT,

    CHECK (caja_desde_id <> caja_hasta_id)
);

-- =========================================================
-- 4. PUBLICIDAD Y BONOS
-- =========================================================

CREATE TABLE publicidad (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    turno_id BIGINT NOT NULL REFERENCES turnos(id)
        ON DELETE CASCADE,

    UNIQUE (turno_id)
);

CREATE TABLE lineas_publicidad (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    publicidad_id BIGINT NOT NULL REFERENCES publicidad(id)
        ON DELETE CASCADE,
    total_llegados INTEGER NOT NULL DEFAULT 0,
    nuevos INTEGER NOT NULL DEFAULT 0,
    repetidos INTEGER NOT NULL DEFAULT 0,
    sin_respuesta INTEGER NOT NULL DEFAULT 0,
    total_derivados INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE lineas_publicidad_x_caja (
    caja_id BIGINT NOT NULL REFERENCES cajas(id)
        ON DELETE CASCADE,
    linea_publicidad_id BIGINT NOT NULL
        REFERENCES lineas_publicidad(id)
        ON DELETE CASCADE,
    num_derivado INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (caja_id, linea_publicidad_id)
);

CREATE TABLE bonos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    turno_id BIGINT NOT NULL REFERENCES turnos(id)
        ON DELETE CASCADE,
    total_otorgado NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_recuperado NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_publicidad NUMERIC(14,2) NOT NULL DEFAULT 0,
    numero_bonos INTEGER NOT NULL DEFAULT 0,

    UNIQUE (turno_id)
);

CREATE TABLE lineas_bonos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bono_id BIGINT NOT NULL REFERENCES bonos(id)
        ON DELETE CASCADE,
    valor NUMERIC(14,2) NOT NULL,
    recuperado BOOLEAN NOT NULL DEFAULT FALSE,
    es_publicidad BOOLEAN NOT NULL DEFAULT FALSE,
    notas TEXT,
    fecha_hora_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 5. FICHAS Y PLATAFORMAS
-- =========================================================

CREATE TABLE plataformas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    caja_id BIGINT NOT NULL REFERENCES cajas(id)
        ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    color_id BIGINT REFERENCES colores(id)
        ON DELETE SET NULL
);

CREATE TABLE subplataformas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    plataforma_id BIGINT NOT NULL REFERENCES plataformas(id)
        ON DELETE CASCADE,
    color_id BIGINT REFERENCES colores(id)
        ON DELETE SET NULL
);

CREATE TABLE fichas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fichas_inicial NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (fichas_inicial >= 0),
    fichas_final NUMERIC(14,2)
        CHECK (fichas_final >= 0),
    turno_id BIGINT NOT NULL REFERENCES turnos(id)
        ON DELETE CASCADE,
    plataforma_id BIGINT NOT NULL REFERENCES plataformas(id)
        ON DELETE RESTRICT,

    UNIQUE (turno_id, plataforma_id)
);

CREATE TABLE cargas_fichas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fichas_id BIGINT NOT NULL REFERENCES fichas(id)
        ON DELETE CASCADE,
    valor NUMERIC(14,2) NOT NULL,
    fecha_hora_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 6. LOGÍSTICA
-- =========================================================

CREATE TABLE logistica (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    turno_id BIGINT NOT NULL REFERENCES turnos(id)
        ON DELETE CASCADE,

    UNIQUE (turno_id)
);

CREATE TABLE lineas_logistica (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    logistica_id BIGINT NOT NULL REFERENCES logistica(id)
        ON DELETE CASCADE,
    cuenta_x_turno_id BIGINT NOT NULL
        REFERENCES cuentas_x_turno(id)
        ON DELETE RESTRICT,
    aclaracion TEXT,
    ultimo_reinicio_cobros TIMESTAMPTZ,
    ultimo_reinicio_retiros TIMESTAMPTZ,
    ultimo_reinicio_caja TIMESTAMPTZ,
    ultimo_reinicio_general TIMESTAMPTZ,
    num_orden INTEGER,

    UNIQUE (logistica_id, cuenta_x_turno_id)
);

-- =========================================================
-- 7. USUARIOS / CLIENTES
-- =========================================================

CREATE TABLE usuarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    bloqueado BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE nombres_usuario (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id)
        ON DELETE CASCADE
);

CREATE TABLE telefonos_usuario (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero VARCHAR(50) NOT NULL,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id)
        ON DELETE CASCADE
);

CREATE TABLE titulares_usuario (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id)
        ON DELETE CASCADE
);

CREATE TABLE paneles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    caja_id BIGINT NOT NULL REFERENCES cajas(id)
        ON DELETE CASCADE
);

CREATE TABLE paneles_x_usuario (
    panel_id BIGINT NOT NULL REFERENCES paneles(id)
        ON DELETE CASCADE,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id)
        ON DELETE CASCADE,

    PRIMARY KEY (panel_id, usuario_id)
);

CREATE TABLE subplataformas_x_usuario (
    subplataforma_id BIGINT NOT NULL
        REFERENCES subplataformas(id)
        ON DELETE CASCADE,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id)
        ON DELETE CASCADE,

    PRIMARY KEY (subplataforma_id, usuario_id)
);

CREATE TABLE categorias_usuario (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    color_id BIGINT REFERENCES colores(id)
        ON DELETE SET NULL,
    emote_tipo VARCHAR(100)
);

CREATE TABLE categorias_x_usuario (
    categoria_id BIGINT NOT NULL
        REFERENCES categorias_usuario(id)
        ON DELETE CASCADE,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id)
        ON DELETE CASCADE,

    PRIMARY KEY (categoria_id, usuario_id)
);

CREATE TABLE usuarios_vinculados (
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id)
        ON DELETE CASCADE,
    usuario_rel_id BIGINT NOT NULL REFERENCES usuarios(id)
        ON DELETE CASCADE,

    PRIMARY KEY (usuario_id, usuario_rel_id),

    CHECK (usuario_id < usuario_rel_id)
);

-- =========================================================
-- 8. ESTADOS
-- =========================================================

CREATE TABLE estados (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    imagen TEXT,
    imagen_mini TEXT,
    nombre VARCHAR(100) NOT NULL,
    tipo_estado_id BIGINT NOT NULL REFERENCES tipos_estado(id)
        ON DELETE RESTRICT
);

CREATE TABLE lineas_estado (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    porcentaje NUMERIC(5,2) NOT NULL
        CHECK (porcentaje BETWEEN 0 AND 100),
    condicion_bono_id BIGINT NOT NULL
        REFERENCES condiciones_bono(id)
        ON DELETE RESTRICT,
    subplataforma_id BIGINT NOT NULL
        REFERENCES subplataformas(id)
        ON DELETE CASCADE,
    estado_id BIGINT NOT NULL REFERENCES estados(id)
        ON DELETE CASCADE
);

-- =========================================================
-- 9. OBJETIVOS
-- =========================================================

CREATE TABLE objetivos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    objetivo_alcanzado NUMERIC(14,2) NOT NULL DEFAULT 0,
    objetivo_final NUMERIC(14,2) NOT NULL DEFAULT 0,

    CHECK (fecha_fin >= fecha_inicio)
);

CREATE TABLE objetivos_x_tipo_turno (
    objetivo_id BIGINT NOT NULL REFERENCES objetivos(id)
        ON DELETE CASCADE,
    tipo_turno_id BIGINT NOT NULL REFERENCES tipos_turno(id)
        ON DELETE CASCADE,
    porcentaje NUMERIC(5,2) NOT NULL
        CHECK (porcentaje BETWEEN 0 AND 100),

    PRIMARY KEY (objetivo_id, tipo_turno_id)
);

CREATE TABLE objetivos_x_caja (
    objetivo_id BIGINT NOT NULL REFERENCES objetivos(id)
        ON DELETE CASCADE,
    caja_id BIGINT NOT NULL REFERENCES cajas(id)
        ON DELETE CASCADE,

    PRIMARY KEY (objetivo_id, caja_id)
);

CREATE TABLE subplataformas_x_objetivo (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    valor NUMERIC(14,2) NOT NULL DEFAULT 0,
    subplataforma_id BIGINT NOT NULL
        REFERENCES subplataformas(id)
        ON DELETE CASCADE,
    objetivo_id BIGINT NOT NULL REFERENCES objetivos(id)
        ON DELETE CASCADE,

    UNIQUE (subplataforma_id, objetivo_id)
);

CREATE TABLE subobjetivos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha DATE NOT NULL,
    objetivo_id BIGINT NOT NULL REFERENCES objetivos(id)
        ON DELETE CASCADE,
    objetivo_alcanzado_dia NUMERIC(14,2) NOT NULL DEFAULT 0,
    objetivo_final_dia NUMERIC(14,2) NOT NULL DEFAULT 0,

    UNIQUE (fecha, objetivo_id)
);

CREATE TABLE subobjetivos_x_turno (
    subobjetivo_id BIGINT NOT NULL REFERENCES subobjetivos(id)
        ON DELETE CASCADE,
    turno_id BIGINT NOT NULL REFERENCES turnos(id)
        ON DELETE CASCADE,
    objetivo_alcanzado_turno NUMERIC(14,2) NOT NULL DEFAULT 0,
    objetivo_final_turno NUMERIC(14,2) NOT NULL DEFAULT 0,

    PRIMARY KEY (subobjetivo_id, turno_id)
);

-- =========================================================
-- 10. RELACIONES AÑADIDAS DESPUÉS DE CREAR USUARIOS
-- =========================================================

ALTER TABLE propinas
    ADD CONSTRAINT fk_propinas_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE SET NULL;

ALTER TABLE cargas_ta
    ADD CONSTRAINT fk_cargas_ta_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id)
    ON DELETE SET NULL;

-- =========================================================
-- 11. ÍNDICES
-- =========================================================

CREATE INDEX idx_billeteras_tipo_billetera ON billeteras(tipo_billetera_id);
CREATE INDEX idx_cajas_color ON cajas(color_id);
CREATE INDEX idx_titulares_x_caja_titular ON titulares_x_caja(titular_id);
CREATE INDEX idx_titulares_x_caja_caja ON titulares_x_caja(caja_id);
CREATE INDEX idx_billeteras_x_caja_billetera ON billeteras_x_caja(billetera_id);
CREATE INDEX idx_billeteras_x_caja_caja ON billeteras_x_caja(caja_id);
CREATE INDEX idx_tipos_turno_caja ON tipos_turno(caja_id);
CREATE INDEX idx_tipos_turno_color ON tipos_turno(color_id);
CREATE INDEX idx_dias_turno_tipo_turno ON dias_turno(tipo_turno_id);
CREATE INDEX idx_turnos_dia_turno ON turnos(dia_turno_id);
CREATE INDEX idx_turnos_caja ON turnos(caja_id);

CREATE INDEX idx_cuentas_titular ON cuentas(titular_id);
CREATE INDEX idx_cuentas_billetera ON cuentas(billetera_id);
CREATE INDEX idx_cuentas_tipo_cuenta ON cuentas(tipo_cuenta_id);
CREATE INDEX idx_cuentas_x_caja_caja ON cuentas_x_caja(caja_id);
CREATE INDEX idx_cuentas_x_turno_cuenta_caja ON cuentas_x_turno(cuenta_id, caja_id);

CREATE INDEX idx_propinas_turno ON propinas(turno_id);
CREATE INDEX idx_propinas_usuario ON propinas(usuario_id);
CREATE INDEX idx_cargas_ta_turno ON cargas_ta(turno_id);
CREATE INDEX idx_cargas_ta_usuario ON cargas_ta(usuario_id);
CREATE INDEX idx_dinero_encontrado_cuenta_x_turno ON dinero_encontrado(cuenta_x_turno_id);
CREATE INDEX idx_gastos_turno ON gastos(turno_id);
CREATE INDEX idx_gastos_tipo_gasto ON gastos(tipo_gasto_id);
CREATE INDEX idx_movimientos_turno ON movimientos(turno_id);
CREATE INDEX idx_movimientos_desde ON movimientos(caja_desde_id);
CREATE INDEX idx_movimientos_hasta ON movimientos(caja_hasta_id);

CREATE INDEX idx_lineas_publicidad_publicidad ON lineas_publicidad(publicidad_id);
CREATE INDEX idx_lineas_publicidad_x_caja_linea ON lineas_publicidad_x_caja(linea_publicidad_id);
CREATE INDEX idx_lineas_bonos_bono ON lineas_bonos(bono_id);

CREATE INDEX idx_plataformas_caja ON plataformas(caja_id);
CREATE INDEX idx_plataformas_color ON plataformas(color_id);
CREATE INDEX idx_subplataformas_plataforma ON subplataformas(plataforma_id);
CREATE INDEX idx_subplataformas_color ON subplataformas(color_id);
CREATE INDEX idx_fichas_plataforma ON fichas(plataforma_id);
CREATE INDEX idx_cargas_fichas_fichas ON cargas_fichas(fichas_id);

CREATE INDEX idx_lineas_logistica_logistica ON lineas_logistica(logistica_id);
CREATE INDEX idx_lineas_logistica_cuenta_x_turno ON lineas_logistica(cuenta_x_turno_id);

CREATE INDEX idx_nombres_usuario_usuario ON nombres_usuario(usuario_id);
CREATE INDEX idx_telefonos_usuario_usuario ON telefonos_usuario(usuario_id);
CREATE INDEX idx_titulares_usuario_usuario ON titulares_usuario(usuario_id);
CREATE INDEX idx_paneles_caja ON paneles(caja_id);
CREATE INDEX idx_paneles_x_usuario_usuario ON paneles_x_usuario(usuario_id);
CREATE INDEX idx_subplataformas_x_usuario_usuario ON subplataformas_x_usuario(usuario_id);
CREATE INDEX idx_categorias_usuario_color ON categorias_usuario(color_id);
CREATE INDEX idx_categorias_x_usuario_usuario ON categorias_x_usuario(usuario_id);
CREATE INDEX idx_usuarios_vinculados_rel ON usuarios_vinculados(usuario_rel_id);

CREATE INDEX idx_estados_tipo_estado ON estados(tipo_estado_id);
CREATE INDEX idx_lineas_estado_condicion_bono ON lineas_estado(condicion_bono_id);
CREATE INDEX idx_lineas_estado_subplataforma ON lineas_estado(subplataforma_id);
CREATE INDEX idx_lineas_estado_estado ON lineas_estado(estado_id);

CREATE INDEX idx_objetivos_x_tipo_turno_tipo_turno ON objetivos_x_tipo_turno(tipo_turno_id);
CREATE INDEX idx_objetivos_x_caja_caja ON objetivos_x_caja(caja_id);
CREATE INDEX idx_subplataformas_x_objetivo_objetivo ON subplataformas_x_objetivo(objetivo_id);
CREATE INDEX idx_subplataformas_x_objetivo_subplataforma ON subplataformas_x_objetivo(subplataforma_id);
CREATE INDEX idx_subobjetivos_objetivo ON subobjetivos(objetivo_id);
CREATE INDEX idx_subobjetivos_x_turno_turno ON subobjetivos_x_turno(turno_id);

-- =========================================================
-- 12. CAJEROS Y PLANIFICACIÓN
-- =========================================================

CREATE TABLE cajeros (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    notas TEXT
);

CREATE TABLE asignaciones_cajero (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cajero_id BIGINT NOT NULL REFERENCES cajeros(id)
        ON DELETE CASCADE,
    dia_turno_id BIGINT NOT NULL REFERENCES dias_turno(id)
        ON DELETE CASCADE,
    fecha_desde DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_hasta DATE,

    CHECK (
        fecha_hasta IS NULL
        OR fecha_hasta >= fecha_desde
    )
);

CREATE TABLE excepciones_cajero (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cajero_id BIGINT NOT NULL REFERENCES cajeros(id)
        ON DELETE CASCADE,
    fecha DATE NOT NULL,
    dia_turno_id BIGINT REFERENCES dias_turno(id)
        ON DELETE SET NULL,
    tipo_excepcion VARCHAR(50) NOT NULL,
    notas TEXT
);

CREATE INDEX idx_asignaciones_cajero_cajero ON asignaciones_cajero(cajero_id);
CREATE INDEX idx_asignaciones_cajero_dia_turno ON asignaciones_cajero(dia_turno_id);
CREATE INDEX idx_excepciones_cajero_fecha ON excepciones_cajero(fecha);
CREATE INDEX idx_excepciones_cajero_dia_turno ON excepciones_cajero(dia_turno_id);
CREATE INDEX idx_excepciones_cajero_cajero ON excepciones_cajero(cajero_id);