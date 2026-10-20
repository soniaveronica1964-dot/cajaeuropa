-- Development-only policy for the anonymous app role.
-- Run this in the Supabase SQL Editor to allow category assignments on user creation.
ALTER TABLE public.categorias_x_usuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dev_read_categorias_x_usuario
  ON public.categorias_x_usuario;
CREATE POLICY dev_read_categorias_x_usuario
  ON public.categorias_x_usuario
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS dev_insert_categorias_x_usuario
  ON public.categorias_x_usuario;
CREATE POLICY dev_insert_categorias_x_usuario
  ON public.categorias_x_usuario
  FOR INSERT TO anon
  WITH CHECK (true);
