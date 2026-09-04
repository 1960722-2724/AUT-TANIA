# AGENTS.md

## 1. Descripción del proyecto

Este proyecto es una aplicación web para procesar archivos PDF y convertir la información relevante del documento en datos estructurados y posteriormente en un archivo Excel.

El flujo general de la aplicación será:

```text
PDF
 ↓
Carga
 ↓
Procesamiento
 ↓
Extracción de información
 ↓
Identificación del registro fotográfico
 ↓
Almacenamiento de imagen
 ↓
Visualización de resultados
 ↓
Generación de Excel
 ↓
Descarga
```

La aplicación tendrá dos tipos de usuario:

* ADMIN
* USUARIO

---

# 2. Stack tecnológico

## Frontend

* HTML5
* CSS3 Vanilla
* JavaScript Vanilla
* Fetch API / AJAX
* Google Fonts — Barlow
* SVG para iconos

## Backend — etapa posterior

* PHP 8.1+
* PHP Sessions
* PHP puro
* PDO

## Base de datos — etapa posterior

* MySQL 5.7+
* MariaDB 10.3+

## Procesamiento — etapa posterior

* Procesamiento de PDF
* Imagick / ImageMagick
* Tesseract OCR únicamente si es necesario

## Excel — etapa posterior

* SimpleXLSXGen

## Servidor — etapa posterior

* Apache + mod_rewrite

## Control de versiones

* Git

---

# 3. Regla fundamental: desarrollo página por página

El proyecto debe desarrollarse **una página a la vez**.

NO construir toda la aplicación en una sola ejecución.

El agente debe trabajar únicamente sobre la fase actualmente solicitada.

### Orden de desarrollo

```text
FASE 1 → Login
FASE 2 → Registro
FASE 3 → Dashboard
FASE 4 → Subir PDF
FASE 5 → Procesando
FASE 6 → Resultado
FASE 7 → Historial
FASE 8 → Administración
```

Después de terminar una fase:

1. Detener el desarrollo.
2. Informar qué se construyó.
3. No comenzar automáticamente la siguiente fase.
4. Esperar la aprobación o instrucción del usuario.

---

# 4. Regla de no adelantar trabajo

Si se está trabajando en Login:

NO crear:

* Dashboard
* Registro
* Historial
* Administración
* Procesamiento
* Resultado

aunque ya se conozca cómo serán esas páginas.

Solo crear los archivos estrictamente necesarios para la fase actual.

No crear componentes, funciones o archivos destinados a fases futuras salvo que sean indispensables para que la página actual funcione.

---

# 5. Primera etapa: prototipo visual

Inicialmente el proyecto será únicamente frontend.

Utilizar:

```text
HTML5
CSS3
JavaScript Vanilla
```

No implementar todavía:

* PHP
* MySQL
* MariaDB
* API real
* Sesiones reales
* OCR
* Procesamiento real de PDF
* Generación real de Excel
* Servidor
* Autenticación real

Cuando sea necesario mostrar información dinámica, utilizar datos simulados.

---

# 6. Estructura del proyecto

La raíz pública del proyecto será `public/`.

```text
/
├── public/
│   ├── index.html
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── login.html
│   │   │   └── register.html
│   │   │
│   │   ├── dashboard/
│   │   │   └── dashboard.html
│   │   │
│   │   ├── procesamiento/
│   │   │   ├── subir-pdf.html
│   │   │   ├── procesando.html
│   │   │   └── resultado.html
│   │   │
│   │   ├── historial/
│   │   │   └── historial.html
│   │   │
│   │   └── administracion/
│   │       └── usuarios.html
│   │
│   ├── css/
│   │   ├── variables.css
│   │   ├── base.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   ├── auth.css
│   │   ├── dashboard.css
│   │   ├── procesamiento.css
│   │   ├── historial.css
│   │   └── administracion.css
│   │
│   ├── js/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── procesar.js
│   │   ├── resultado.js
│   │   ├── historial.js
│   │   └── administracion.js
│   │
│   └── assets/
│       ├── images/
│       └── icons/
│
└── AGENTS.md
```

No es obligatorio crear todos estos archivos desde el inicio.

Crear únicamente los archivos necesarios para la fase actual.

---

# 7. Nombres de archivos

Respetar exactamente los nombres definidos anteriormente.

## JavaScript

```text
app.js
auth.js
dashboard.js
procesar.js
resultado.js
historial.js
administracion.js
```

## CSS

```text
variables.css
base.css
layout.css
components.css
auth.css
dashboard.css
procesamiento.css
historial.css
administracion.css
```

No cambiar nombres sin una razón técnica clara.

---

# 8. Paleta de colores

La aplicación debe utilizar exclusivamente la paleta definida:

```css
:root {
    --azul-principal: #2E3B92;
    --azul-hover: #25317E;
    --azul-borde: #3949AB;

    --blanco: #FFFFFF;

    --gris-fondo: #F4F4F4;
    --gris-borde: #CFCFCF;
    --gris-texto: #666666;
}
```

## Uso

```text
--azul-principal
Botones principales, elementos destacados y navegación.

--azul-hover
Estado hover de elementos interactivos.

--azul-borde
Bordes y estados activos.

--blanco
Tarjetas, formularios y superficies principales.

--gris-fondo
Fondo general.

--gris-borde
Bordes de inputs, tarjetas y tablas.

--gris-texto
Texto secundario.
```

No inventar una nueva paleta.

No agregar colores arbitrarios.

Si se necesita otro color por accesibilidad o estado funcional, utilizarlo únicamente cuando sea necesario y mantenerlo coherente con el diseño existente.

---

# 9. Tipografía

Utilizar:

```text
Barlow
```

mediante Google Fonts.

La tipografía debe mantenerse consistente en toda la aplicación.

---

# 10. Diseño visual

El diseño debe ser:

* Moderno.
* Minimalista.
* Profesional.
* Limpio.
* Claro.
* Fácil de utilizar.
* Responsive.

Priorizar:

* Buena jerarquía visual.
* Espaciado consistente.
* Formularios claros.
* Botones fáciles de identificar.
* Estados visuales claros.
* Diseño coherente entre páginas.

No sobrecargar las interfaces con elementos innecesarios.

---

# 11. CSS

Utilizar únicamente CSS Vanilla.

No utilizar:

* Bootstrap
* Tailwind
* Material UI
* Bulma
* Foundation
* Frameworks CSS

Separar responsabilidades.

### variables.css

Variables globales:

* Colores.
* Tipografía.
* Espaciados.
* Bordes.
* Sombras.
* Otras variables necesarias.

### base.css

* Reset.
* Estilos globales.
* Tipografía.
* Elementos HTML básicos.

### layout.css

* Estructura general.
* Header.
* Sidebar.
* Contenedores.
* Layout responsive.

### components.css

Componentes reutilizables:

* Botones.
* Cards.
* Inputs.
* Selects.
* Tablas.
* Alerts.
* Badges.
* Modales.

### CSS específico

Cada página puede tener su propio archivo:

```text
auth.css
dashboard.css
procesamiento.css
historial.css
administracion.css
```

---

# 12. JavaScript

Utilizar JavaScript Vanilla.

No utilizar frameworks.

Mantener los scripts separados por responsabilidad.

Ejemplo:

```text
auth.js
```

Gestiona login y registro.

```text
dashboard.js
```

Gestiona únicamente el dashboard.

```text
procesar.js
```

Gestiona la carga y simulación del procesamiento del PDF.

```text
resultado.js
```

Gestiona la visualización del resultado.

---

# 13. Datos simulados

Durante la etapa visual se pueden utilizar datos mock.

Los mocks deben representar aproximadamente la estructura que tendrá la aplicación real.

Por ejemplo:

```javascript
const mockData = {
    usuarios: [],
    procesos: [],
    resultadoPDF: {}
};
```

No crear datos ficticios innecesarios.

---

# 14. Preparación para API futura

Aunque inicialmente no exista backend, las funciones deben diseñarse pensando en la futura API.

Ejemplo:

```javascript
procesarPDF(archivo)
```

Debe devolver una `Promise`.

Inicialmente:

```text
procesarPDF()
 ↓
mock
 ↓
datos simulados
```

Posteriormente:

```text
procesarPDF()
 ↓
fetch('/api/pdf/procesar')
 ↓
PHP
 ↓
respuesta real
```

La interfaz no debería depender directamente de la implementación interna del mock.

---

# 15. Navegación

La navegación inicial puede utilizar enlaces HTML normales.

Ejemplo:

```text
login.html
 ↓
dashboard.html
 ↓
subir-pdf.html
 ↓
procesando.html
 ↓
resultado.html
 ↓
historial.html
```

No implementar un sistema SPA.

No utilizar routers externos.

---

# 16. Fases visuales

## FASE 1 — Login

Crear únicamente la pantalla de Login.

Debe contener:

* Logo/nombre de aplicación.
* Campo correo.
* Campo contraseña.
* Botón iniciar sesión.
* Enlace a registro.
* Estados visuales básicos.

Puede utilizar autenticación simulada.

---

## FASE 2 — Registro

Crear:

* Nombre.
* Correo.
* Contraseña.
* Confirmación de contraseña.
* Botón de registro.
* Enlace a Login.

Utilizar validaciones frontend básicas.

---

## FASE 3 — Dashboard

Crear:

* Sidebar.
* Navegación.
* Estadísticas.
* Procesos recientes.
* Acción "Procesar nuevo PDF".

Utilizar información simulada.

---

## FASE 4 — Subir PDF

Crear:

* Área de carga.
* Drag & Drop.
* Selector de archivo.
* Información del archivo.
* Botón "Procesar PDF".

Solo simular el procesamiento.

---

## FASE 5 — Procesando

Crear una pantalla de procesamiento:

```text
Procesando PDF...
```

Mostrar:

* Animación.
* Estado.
* Progreso visual.
* Mensaje informativo.

No ejecutar procesamiento real.

---

## FASE 6 — Resultado

Mostrar:

* Datos extraídos simulados.
* Registro fotográfico.
* Imagen de ejemplo.
* Botón generar Excel.
* Estado de resultado.

---

## FASE 7 — Historial

Mostrar:

* Tabla de procesos.
* Archivo.
* Fecha.
* Estado.
* Usuario.
* Resultado.
* Acciones.

Utilizar datos mock.

---

## FASE 8 — Administración

Disponible visualmente únicamente para ADMIN.

Mostrar:

* Lista de usuarios.
* Nombre.
* Correo.
* Rol.
* Estado.
* Acciones.
* Crear usuario.
* Editar usuario.

Inicialmente todo será simulado.

---

# 17. Procesamiento del PDF

El procesamiento real se implementará posteriormente.

Cuando llegue esa etapa, el flujo será:

```text
PDF
 ↓
Lectura
 ↓
Extracción de información
 ↓
Localización de REGISTRO FOTOGRÁFICO
 ↓
Identificación de la primera imagen correspondiente
 ↓
Guardar imagen
 ↓
Mostrar resultado
 ↓
Generar Excel
```

La estructura del documento se considera consistente según las reglas establecidas para el proyecto.

No crear un sistema genérico innecesariamente complejo.

---

# 18. Registro fotográfico

La aplicación debe identificar la sección:

```text
REGISTRO FOTOGRÁFICO
```

La imagen objetivo será la primera imagen correspondiente según la estructura definida del documento.

La imagen deberá posteriormente:

1. Ser identificada.
2. Ser extraída.
3. Ser almacenada.
4. Poder visualizarse en la aplicación.

Durante el prototipo visual se utilizará una imagen de ejemplo.

---

# 19. Excel

La generación real del Excel se implementará posteriormente utilizando:

```text
SimpleXLSXGen
```

Durante el prototipo únicamente simular la acción y el resultado.

---

# 20. Backend futuro

Cuando termine el prototipo visual se podrá implementar:

```text
PHP
 ↓
API
 ↓
MySQL/MariaDB
```

Endpoints previstos:

```text
/api/auth/
/api/usuarios/
/api/pdf/
/api/procesos/
/api/excel/
```

No crear estos endpoints durante la etapa visual.

---

# 21. Base de datos futura

La base de datos se implementará posteriormente.

Entidades principales previstas:

```text
usuarios
procesos
datos_extraidos
imagenes
archivos
```

No crear la base de datos durante la etapa visual.

---

# 22. Seguridad futura

Cuando se implemente PHP se utilizarán:

* `password_hash()`
* `password_verify()`
* PHP Sessions
* PDO con consultas preparadas
* Validación de archivos
* Control de permisos por rol
* Protección CSRF cuando corresponda

No implementar estas funcionalidades durante el prototipo visual.

---

# 23. No sobreingenierizar

La aplicación debe mantenerse simple.

No introducir tecnologías o patrones complejos si no son necesarios.

No agregar:

* Microservicios.
* Arquitecturas distribuidas.
* Frameworks.
* ORMs.
* Sistemas de eventos.
* Colas.
* Docker obligatorio.
* Servicios externos.
* Librerías innecesarias.

La solución debe ser la más sencilla que permita cumplir el requisito.

---

# 24. Regla de cambios

No modificar páginas previamente aprobadas salvo que el usuario lo solicite.

No cambiar:

* Stack.
* Paleta.
* Estructura.
* Nombres de archivos.
* Flujo principal.

sin una razón clara o una instrucción explícita.

---

# 25. Regla de finalización de cada fase

Al terminar una fase:

1. Verificar que la página funciona.
2. Verificar rutas.
3. Verificar estilos.
4. Verificar responsive básico.
5. Verificar que no existan errores JavaScript.
6. Informar brevemente los archivos creados/modificados.
7. Detenerse.

**No continuar automáticamente con la siguiente fase.**

La siguiente fase solamente comienza cuando el usuario la solicite.

---

# 26. Prioridad general

Las prioridades del proyecto son:

```text
1. Simplicidad
2. Claridad visual
3. Consistencia
4. Funcionalidad básica
5. Modularidad
6. Facilidad de futura integración con PHP
```

El objetivo inicial no es construir un sistema robusto.

El objetivo inicial es construir **una interfaz visual completa, coherente y funcional página por página**, preparada para conectar posteriormente el backend real.
