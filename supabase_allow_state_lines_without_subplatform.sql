-- Permite guardar líneas de estado sin plataforma cuando su condición no la requiere.
-- Ejecutar una vez en Supabase SQL Editor.

ALTER TABLE public.lineas_estado
  ALTER COLUMN subplataforma_id DROP NOT NULL;
