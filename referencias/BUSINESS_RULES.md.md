# -Cajas y Turnos 

## Cajas 

-Debe existir una pestaña de creación de cajas con personalizaciones básicas (nombre, color, ícono) 

-A posterior debe existir un botón de edición para identificar si una caja es de publicidad o no, su principal diferencia con las cajas normales es que los turnos son más personalizables. 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

-Tiene un FK con la tabla de colores. 

## Turnos 

-Cada caja normal consiste principalmente en tres turnos: mañana, tarde y noche (estos van a ser configurables desde la tabla de tipos de turno), y a su vez cada turno tiene una fecha y hora de inicio y una de final, este valor varía según el día y el estado del turno (abierto y cerrado). 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

-Tiene un FK con las tablas de días turnos y de caja. 

## Días turnos 

- -Es una tabla para configurar los días en los que está activo una caja (de lunes a domingo), una hora inicio y final. 

-Se va a identificar por nombre, un campo numérico para mantener un órden (1-7) y un color. 

-Además se incluye un booleano de cruza_medianoche, utilizado principalmente para casos en los que el turno sea desde un horario tardío (ejemplo, 18pm) y termine en un horario del día siguiente (ejemplo, 4am). -Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

-Tiene un FK con la tabla de tipos de turno. 

## Tipos de turnos 

-Para crear los turnos por ejemplo, mañana, tarde y noche, consiste de un nombre, color y un botón de eliminar (desactivado para mantener trazabilidad). 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

- -Tiene un FK con la tabla de colores. 

# -Cuentas 

## Tipos de billeteras 

-Identificados por nombre, se usa para facilitar la organización visual en la caja, normalmente sería: Normal, depósitos y compartidas. 

-Hay algunas billeteras que no utilizamos para cobrar y pagar en simultáneo debido a ciertos tecnicismos o dificultades, para identificarlos creamos dos booleanos para identificar si sirven para uno, para el otro, para los dos o para ninguno (cobros y retiros). 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

## Billeteras 

-Esta tabla es para un entorno global, si se crea un registro, se puede utilizar en cualquier caja creada. 

-Identificados por nombre, son las billeteras virtuales que utilizamos para pagar y cobrar a los clientes. (Mercado Pago, Personal Pay, etc). -Originalmente tenemos un orden para las billeteras, las más importantes solemos acomodarlas delante de las que no se utilizan/se usan poco, para ello creamos un campo numérico para organizar bien los datos. Estos se pueden organizar desde un drag and drop en una lista para acomodarlas a gusto, de modo que la que esté más arriba sea la que se vea primero, y así sucesivamente. 

-La idea es que habiendo varias cajas, al añadir una billetera la “lista de uso”, verifique primero que la billetera no se haya creado en ninguna caja, en caso de encontrarla directamente la vincula a la caja correspondiente. 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

-Tiene un FK con la tabla de tipos de billeteras. 

## Billeteras x Caja 

-Esta tabla es para un entorno asociado a una caja, si se crea un registro, se puede utilizar únicamente en la caja correspondiente. 

-La idea sería mediante un selector o una caja de texto con predicción poder seleccionar una billetera creada en la tabla billeteras para asociarla a la caja actual y así poder utilizarla en las cuentas. 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

-Tiene un FK con las tablas de billeteras y de caja. 

## Titulares 

-Esta tabla es para un entorno global, si se crea un registro, se puede utilizar en cualquier caja creada. 

-Identificados por nombre, son los titulares que poseen las billeteras previamente mencionadas (Fede Acuña, Pablo Totaro, etc.). 

-Idéntico a billeteras, debe tener un drag and drop para editar el orden de los titulares modificando el campo numérico de orden. 

-La idea es que habiendo varias cajas, al añadir un titular a la “lista de uso”, verifique primero que el titular no se haya creado en ninguna caja, en caso de encontrarla directamente la vincula a la caja correspondiente. 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

## Titulares x Caja 

-Esta tabla es para un entorno asociado a una caja, si se crea un registro, se puede utilizar únicamente en la caja correspondiente. 

-La idea sería mediante un selector o una caja de texto con predicción poder seleccionar un titular creado en la tabla titulares para asociarla a la caja actual y así poder utilizarla en las cuentas. 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

- -Tiene un FK con las tablas de titulares y de caja. 

## Tipos de cuentas 

-Tabla creada principalmente para determinar las características de una cuenta. 

-La tabla consiste en: Nombre, bool de “Es compartido”, bool de “Es publicidad” (a revisar a futuro), como idea un “Es ahorro” (Hablado con Seba en estos días), y dos booleanos de cobros/retiros. 

-Son compartidas entre cajas. 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

## Cuentas 

-Esta tabla es para un entorno global, si se crea un registro, se puede utilizar en cualquier caja creada. 

- -Es la “fusión” de los titulares y las billeteras (por ejemplo, Mateo Ferrer - Mercado Pago) y las configuraciones de la tabla tipos de cuentas. -También tiene los datos extra que vamos a utilizar en las notas de las cuentas de las cajas (alias, cuil, patrón, notas) 

- -Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

-Tiene un FK con las tablas de titulares y de billetera y de tipo de cuenta. 

## Cuentas x Caja 

-Esta tabla es para un entorno asociado a una caja, si se crea un registro, se puede utilizar únicamente en la caja correspondiente. 

-La idea sería mediante un selector poder seleccionar una cuenta existente en la tabla cuentas para asociarla a la caja actual y que sea visible dentro de la misma. 

## Cuentas x Turno 

-Similar a la anterior tabla pero para verlo desde los turnos. 

- -Dentro del turno se verían sus respectivos campos: valor o total del dinero en la cuenta, y si se está usando para retiros o para cobros. 

- -Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

- -Tiene un FK con las tablas de turnos, cuentas y caja. 

# -Logística 

## Logística 

-Es una tabla de conexión principalmente para vincular las líneas de logística con el turno correspondiente. 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

- -Tiene un FK con la tabla de turnos. 

## Líneas de logística 

-Es el circuito que nos permite corroborar cual es la cuenta siguiente a utilizar en el turno (la que tenga más tiempo sin usarse), para tener seguimiento de los días en los que se usó, para que se usó, si está activa o no y para qué y una aclaración/nota para saber cual es el límite de uso y para qué se puede utilizar la billetera. 

- -Se pueden ver: último uso de cobros, retiros, caja y general. 

- -Se pueden ordenar visualmente a gusto mediante un drag and drop con un campo de número de orden. 

- -Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

- -Tiene un FK con las tablas de logística y de cuentas por turno. 

# -Publicidad 

## Publicidad 

-Es una tabla de conexión principalmente para vincular las líneas de logística con el turno correspondiente. 

-Tiene un FK con la tabla de turnos. 

## Líneas de publicidad 

-Son los contadores de publicidad que manejamos, consisten en contadores con botones para sumar y restar manualmente la cantidad de llegados y derivados de las publicidades, es una tabla aparte puesto a que añadimos que puedan haber más de una publicidad activa en un turno. 

-La tabla consiste en los siguientes campos numéricos: total llegados, nuevos, repetidos, sin respuesta (calculado automáticamente entre los llegados - nuevos - repetidos) y total derivados (calculado a partir de la tabla de abajo). 

-Tiene un FK con la tabla de publicidad. 

## Líneas de publicidad por caja 

-En un turno podemos tener varias cajas vinculadas en publicidad para anotar a qué caja se derivó el usuario, esta tabla sirve para poder separar esos datos 

-Tiene un FK con las tablas de cajas y líneas de publicidad. 

# -Bonos 

## Bonos 

-Es una tabla para vincular los bonos a los turnos, además de contar con los totalizadores de las líneas (total otorgado, total recuperado y cantidad total de bonos). 

-Tiene un FK con la tabla de turnos. 

## Líneas de bonos 

-Son los registros de bonos que anotamos cada día, cuentan con: monto, bool de si está recuperado y si es de publicidad, notas (descartable desde mi punto de vista), y la fecha y hora de creación del registro. 

-Tiene un FK con la tabla de bonos. 

# -Gastos normales 

## Tipos de gastos 

-Sirve para determinar visualmente para que se gastó X dinero, y también para saber si tiene que sumar o restar a la caja dicho gasto. 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

## Gastos 

-Es el registro de gasto en un turno, junto a su monto y notas en caso de ser necesario. 

-Tiene un FK con las tablas de tipo de gasto y turno. 

## Notas de turno 

-Campos de texto para escribir una nota en el turno en caso de ser necesario y para ver las notas del turno anterior 

## Dinero encontrado 

-Rotamos de billeteras constantemente, a veces puede ocurrir que encontremos dinero el cual no está anotado, esta tabla sirve para eso, en caso de no existir descuadraría la caja al no estar anotado. 

-Tiene un FK con la tabla de cuentas por turno. 

## Cargas TA (turno anterior) 

-Alguna vez ya sea por un fallo en las billeteras, plataforma o bien al cerrar caja queda alguna carga pendiente, y al modificar valores hace que la caja se descuadre, para evitar eso creamos un registro en esta tabla. 

-Tiene un FK con las tablas de turnos y usuarios. 

## Propinas 

-Las propinas que nos dejan los buenos usuarios. 

-Tiene un FK con las tablas de turnos y usuarios. 

## Cargar fichas 

-Cuando cargamos fichas creamos un registro en esta tabla para dejar anotado a que hora y día se cargaron por última vez. 

-Tiene un FK con la tabla de fichas. 

## Fichas 

-Es la tabla donde guardamos el total actual de las fichas de cada plataforma, si nos quedamos sin, no podemos vender. 

-Tiene un FK con las tablas de turno y plataformas. 

## Movimientos 

-A veces necesitamos mover dinero entre cajas, entonces creamos un registro en esta tabla, actualmente también podemos cambiar entre movimientos entre cajas a movimientos de ahorro y guardar ese dinero en una billetera de ahorro. 

-Tiene un FK con las tablas de caja dos veces para marcar un desde qué caja y hasta qué caja se mueve el dinero y turnos y cuentas por turno. 

# -Cajeros (WIP) 

## Cajeros: 

- -Tabla para crear registros de usuarios/cajeros, solo tiene nombre, notas y un desactivado. 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

## Asignaciones de cajeros 

-Es una tabla para designar los turnos de cada cajero y en qué días trabaja y en qué días no, con fecha desde/hasta, siendo esta última un campo nullable en principio ya que si el cajero permanece en ese turno no debería tener un “hasta”. 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

- -Tiene un FK con las tablas de días de turno y de cajero. 

## Excepciones de cajeros 

-Tabla de uso ocasional, para delimitar días en los que X trabajador va a reemplazar a otro en un turno ajeno al suyo. Incluye un campo de fecha y de razón de excepción 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

- -Tiene un FK con las tablas de días de turno y de cajero. 

# -Configuraciones 

## Colores 

-Colores, sin más, tiene nombre y código HEX. 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

## Plataformas 

-Son las plataformas que usamos para cargar las fichas a los usuarios, las identificamos por nombre y color 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

-Tiene un FK con las tablas de colores y de caja. 

## Subplataformas 

-A veces hay plataformas que dentro poseen varias subplataformas internamente, es una tabla para guardar esta información 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

-Tiene un FK con las tablas de colores y de plataforma. 

## Configuración de aplicación 

-Tabla de único registro para configuraciones de la aplicación, actualmente contamos con: nombre, ícono, tema, on/off notas, singleton. 

# -Estados 

## Tipos de estados 

-Tabla para poder indexar y separar los estados según su función o uso, esto se ve plasmado al crear un estado. Cuenta con nombre y la cantidad de porcentajes distintos que puede tener. 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

## Estados 

-Desde esta tabla creamos los registros visibles, cuentan con los campos imagen y la imagen miniatura además del nombre. 

-Tiene un FK con la tabla de tipos de estados. 

## Condiciones de bonos 

-A veces los bonos que subimos son aplicados únicamente a una plataforma (en caso de tener varias), esta tabla sirve para marcar los condicionales (en caso de existir) y un booleano para indicar si es solo para una única plataforma). 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

## Líneas de estados 

-En esta tabla configuramos todo lo previo dentro de estado y añadimos el porcentaje/s según la cantidad de porcentajes que haya marcados en el tipo de estado. 

-Tiene un FK con las tablas de estados, condiciones de bonos y subplataformas. 

# -Objetivos 

## Objetivos 

-Tabla para estadísticas y para marcar un objetivo mensual, semanal, diario, etc. 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

## Objetivos x caja 

-Tabla de conexión para vincular un registro de objetivos con el de una caja 

-Tiene un FK con las tablas de objetivos y de caja. 

## Objetivos x tipo de turno 

-Tabla de conexión entre objetivos y tipo de turno para añadir un porcentaje según si es mañana, tarde o noche, esto lo hacemos principalmente por las diferencias de movimiento entre cada turno, sabemos que por ejemplo el turno tarde mueve mucho más que el turno noche, por ende a ese turno le corresponde una porción más grande de objetivo a cumplir. 

-Tiene un FK con las tablas de objetivos y de tipos de turno. 

## Subobjetivos 

-Tabla para estadísticas y marcar dentro del objetivo un objetivo más corto para ir rellenando la meta de objetivo principal, por ejemplo, si yo tengo un 

registro de objetivo mensual, habrían subobjetivos por día relacionados a cada turno de ese mismo día y se iría modificando según se vaya trabajando. -Tiene un FK con las tablas de objetivos y de caja. 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

## Subobjetivos x turno 

-Tabla de conexión entre subobjetivos y turnos, además de los números obtenidos en el turno y la meta de ese turno 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

-Tiene un FK con las tablas de subobjetivos y de turnos. 

# -Usuarios 

## Usuarios 

-Tabla para hacer un registro de los usuarios que vamos añadiendo a las plataformas, su fecha de creación, y un botón de bloqueo. 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

## Usuarios relacionados 

-A veces hay algún usuario que aparece desde varios números a intentar aprovecharse de las promociones, para saber si existe algún usuario con datos iguales o similares a otro existe esta tabla 

-Tiene dos FK con la tabla de usuarios, para relacionar entre sí ambos registros. 

## Teléfonos usuario 

-Son los teléfonos de los usuarios 

-Tiene un FK con la tabla de usuarios. 

## Nombres usuario 

-Son los nombres de usuario vinculados al usuario. 

-Tiene un FK con la tabla de usuarios. 

## Titulares usuario 

-Son los nombres de titulares vinculados al usuario. 

-Tiene un FK con la tabla de usuarios. 

## Subplataforma por usuario 

-Tabla de conexión entre las subplataformas y los usuarios, similar a los nombres de usuario, si existe un usuario para la primera plataforma, también vinculamos la subplataforma 1 con el usuario. 

-Tiene un FK con las tablas de usuarios y la de subplataformas. 

## Paneles 

-Digamos que son cada pestaña en la que manejamos un WhatsApp, cada panel representa una línea de teléfono donde tenemos a los usuarios. -Tiene un botón de eliminar (desactivado para mantener trazabilidad). -Tiene un FK con la tabla de cajas. 

## Paneles x usuario 

-Tabla de conexión entre los paneles y los usuarios, es para saber en cuales de los paneles que tenemos creados tenemos al usuario asignado. 

-Tiene un FK con las tablas de cajas y usuarios. 

## Categorías de usuario 

-Hay ciertos usuarios a los que categorizamos de manera interna para saber quienes son clientes ejemplares o bien son clientes que han intentado estafarnos, gracias a esta tabla podemos categorizarlos. 

-Tiene un botón de eliminar (desactivado para mantener trazabilidad). 

-Tiene un FK con la tabla de colores. 

## Categorías por usuario 

-Tabla de conexión entre las categorías y los usuarios. 

-Tiene un FK con las tablas de categorías y usuarios. 

