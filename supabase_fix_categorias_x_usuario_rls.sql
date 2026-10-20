-- Development-only policies for category assignments on user creation and editing.
-- Run this in the Supabase SQL Editor to allow the anonymous app role to read, add, and remove assignments.
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

DROP POLICY IF EXISTS dev_delete_categorias_x_usuario
  ON public.categorias_x_usuario;
CREATE POLICY dev_delete_categorias_x_usuario
  ON public.categorias_x_usuario
  FOR DELETE TO anon
  USING (true);
