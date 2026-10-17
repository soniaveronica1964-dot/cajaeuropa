BEGIN;

ALTER TABLE paneles_x_usuario
    DROP CONSTRAINT paneles_x_usuario_pkey;

ALTER TABLE paneles_x_usuario
    ADD COLUMN id BIGINT GENERATED ALWAYS AS IDENTITY,
    ADD COLUMN caja_id BIGINT REFERENCES cajas(id) ON DELETE CASCADE;

UPDATE paneles_x_usuario AS user_panel
SET caja_id = panel.caja_id
FROM paneles AS panel
WHERE panel.id = user_panel.panel_id;

ALTER TABLE paneles_x_usuario
    ALTER COLUMN id SET NOT NULL,
    ALTER COLUMN caja_id SET NOT NULL,
    ALTER COLUMN panel_id DROP NOT NULL,
    ADD CONSTRAINT paneles_x_usuario_pkey PRIMARY KEY (id);

ALTER TABLE paneles_x_usuario
    DROP CONSTRAINT paneles_x_usuario_panel_id_fkey,
    ADD CONSTRAINT paneles_x_usuario_panel_id_fkey
        FOREIGN KEY (panel_id)
        REFERENCES paneles(id)
        ON DELETE SET NULL;

CREATE UNIQUE INDEX idx_paneles_x_usuario_usuario_panel
    ON paneles_x_usuario(usuario_id, panel_id)
    WHERE panel_id IS NOT NULL;

CREATE UNIQUE INDEX idx_paneles_x_usuario_usuario_caja
    ON paneles_x_usuario(usuario_id, caja_id)
    WHERE panel_id IS NULL;

CREATE OR REPLACE FUNCTION completar_caja_panel_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.panel_id IS NOT NULL THEN
        SELECT caja_id INTO NEW.caja_id
        FROM paneles
        WHERE id = NEW.panel_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_completar_caja_panel_usuario
BEFORE INSERT OR UPDATE OF panel_id, caja_id
ON paneles_x_usuario
FOR EACH ROW
EXECUTE FUNCTION completar_caja_panel_usuario();

COMMIT;
