WITH palette(nombre, hex) AS (
  VALUES
    ('Rojo', '#E53935'),
    ('Rosa intenso', '#D81B60'),
    ('Púrpura', '#8E24AA'),
    ('Violeta', '#5E35B1'),
    ('Azul índigo', '#3949AB'),
    ('Azul', '#1E88E5'),
    ('Celeste', '#039BE5'),
    ('Cian', '#00ACC1'),
    ('Verde petróleo', '#00897B'),
    ('Verde', '#43A047'),
    ('Verde lima', '#7CB342'),
    ('Lima', '#C0CA33'),
    ('Amarillo', '#FDD835'),
    ('Ámbar', '#FFB300'),
    ('Naranja', '#FB8C00'),
    ('Naranja rojizo', '#F4511E'),
    ('Marrón', '#6D4C41'),
    ('Gris', '#757575'),
    ('Azul grisáceo', '#546E7A'),
    ('Rosa', '#EC407A'),
    ('Lila', '#AB47BC'),
    ('Lavanda', '#7E57C2'),
    ('Azul lavanda', '#5C6BC0'),
    ('Azul claro', '#42A5F5'),
    ('Turquesa', '#26C6DA'),
    ('Verde azulado', '#26A69A'),
    ('Verde claro', '#66BB6A'),
    ('Verde manzana', '#9CCC65'),
    ('Verde lima claro', '#D4E157'),
    ('Amarillo claro', '#FFEE58'),
    ('Dorado', '#FFCA28'),
    ('Naranja claro', '#FFA726'),
    ('Coral', '#FF7043'),
    ('Marrón claro', '#8D6E63'),
    ('Gris azulado', '#78909C'),
    ('Rojo claro', '#EF5350'),
    ('Rosa claro', '#F06292'),
    ('Malva', '#BA68C8'),
    ('Violeta claro', '#9575CD'),
    ('Azul violáceo', '#7986CB')
),
inserted AS (
  INSERT INTO public.colores (nombre, hex)
  SELECT palette.nombre, palette.hex
  FROM palette
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.colores existing
    WHERE upper(btrim(existing.hex)) = palette.hex
  )
  RETURNING id, nombre, hex
)
SELECT id, nombre, hex
FROM inserted
ORDER BY id;
