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

## Backend — procesamiento de PDF (implementado)

* PHP 8.1+ (en desarrollo local: PHP 8.2)
* PHP puro
* Poppler (pdftotext, pdftoppm, pdfimages, pdfinfo)
* Tesseract OCR + idioma español (`spa`) — solo para PDFs escaneados

## Backend — etapa posterior

* PHP Sessions
* PDO
* PHP puro

## Base de datos — etapa posterior

* MySQL 5.7+
* MariaDB 10.3+

## Procesamiento — etapa posterior

* Excel: SimpleXLSXGen
* Imagick / ImageMagick si fuese necesario (no se usa actualmente)

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
FASE 6 → Hallazgo (ficha del hallazgo: primera pantalla tras el procesamiento)
FASE 7 → Resultado
FASE 8 → Historial
FASE 9 → Administración
```

> **Estado actual:** las fases 1 a 6 están implementadas (Login y Registro con autenticación simulada; Dashboard, Subir PDF, Procesando y Hallazgo con el endpoint real `/api/pdf/subir.php`).

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

# 5. Primera etapa: prototipo visual + procesamiento de PDF

El proyecto empezó como prototipo visual (frontend). Parte de ese prototipo sigue en pie: autenticación, sesiones, base de datos y generación de Excel son todavía simuladas o futuras.

**Ya implementados** (reales, no simulados):

* Procesamiento real de PDF (ver sección 17).
* OCR de documentos escaneados (Tesseract, idioma `spa`).
* Endpoint `/api/pdf/subir.php` que recibe un PDF y devuelve los datos extraídos.

Utilizar en el frontend:

```text
HTML5
CSS3
JavaScript Vanilla
```

**No implementar todavía**:

* MySQL
* MariaDB
* API de autenticación real
* Sesiones reales
* Persistencia en base de datos
* Generación real de Excel
* Historial / Administración reales

Cuando sea necesario mostrar información dinámica de lo que aún no es real, utilizar datos simulados.

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
│   │   │   ├── subir-pdf/
│   │   │   ├── procesando/
│   │   │   ├── hallazgo/         → ficha del hallazgo (primer pantalla tras el procesamiento)
│   │   │   │   └── hallazgo.html
│   │   │   ├── paso1/            → detalle crudo de los datos extraídos del PDF
│   │   │   │   └── paso1.html
│   │   │   ├── paso2/            → formulario de validación del técnico
│   │   │   │   └── paso2.html
│   │   │   └── resultado/
│   │   │
│   │   ├── historial/
│   │   │   └── historial.html
│   │   │
│   │   └── administracion/
│   │       └── usuarios.html
│   │
│   ├── api/
│   │   ├── config.php
│   │   └── pdf/
│   │       ├── subir.php
│   │       ├── PdfProcessor.php
│   │       └── tmp/             → archivos temporales (no versionar)
│   │
│   ├── css/
│   │   ├── variables.css
│   │   ├── base.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   ├── auth.css
│   │   ├── dashboard.css
│   │   ├── procesamiento.css
│   │   ├── hallazgo.css
│   │   ├── paso1.css
│   │   ├── paso2.css
│   │   ├── historial.css
│   │   └── administracion.css
│   │
│   ├── js/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── hallazgo.js
│   │   ├── paso1.js
│   │   ├── paso2.js
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

El flujo de procesamiento definido es:

```text
dashboard
 ↓
subir-pdf
 ↓
procesando
 ↓
hallazgo (ficha resumida del hallazgo detectado)
 ↓
paso2 (validación del técnico)
 ↓
resultado (generación de Excel)
```

El trigger de subida reside actualmente en el Dashboard (dropzone). El endpoint `/api/pdf/subir.php` procesa el PDF y `dashboard.js` redirige a `procesamiento/hallazgo/hallazgo.html` con el resultado. `paso1.html` muestra el detalle crudo de los datos extraídos.

---

# 7. Nombres de archivos

Respetar exactamente los nombres definidos anteriormente.

## JavaScript

```text
app.js
auth.js
dashboard.js
hallazgo.js
paso1.js
paso2.js
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
hallazgo.css
paso1.css
paso2.css
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

    --gris-fondo: #F3F5F8;
    --gris-borde: #CFCFCF;
    --gris-texto: #666666;

    --naranja: #F59A23;
    --naranja-oscuro: #B45309;
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

--naranja
Estados funcionales: advertencias, estados de proceso en curso.

--naranja-oscuro
Texto/hover de alertas de advertencia.
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

Incluye los estilos compartidos que usan varias páginas:

* `.page-card` y su familia (`.page-card-header`, `.page-card-title`, `.page-card-subtitle`, `.card-body`, `.card-center`).
* Formularios (`.form-grid`, `.form-group`, `.form-label`, `.form-input`, `.form-select`, `.form-textarea`, `.form-error`, `.field-full`).
* Listas de información (`.info-list`, `.info-item`).
* `.empty-text`.

Los CSS específicos de página (`paso1.css`, `paso2.css`, etc.) solo deben contener estilos propios de esa página. **No** reproducir componentes que ya viven en `components.css`.

### CSS específico

Cada página puede tener su propio archivo:

```text
auth.css
dashboard.css
procesamiento.css
hallazgo.css
paso1.css
paso2.css
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

Gestiona únicamente el dashboard (incluye la subida del PDF al endpoint `/api/pdf/subir.php`).

```text
hallazgo.js
```

Muestra la ficha del hallazgo detectado (resumen, campos estructurados del `hallazgo`, evidencia fotográfica).

```text
paso1.js
```

Muestra el resultado del procesamiento (texto, coordenadas, registro fotográfico).

```text
paso2.js
```

Gestiona el formulario de validación del técnico.

```text
procesar.js
```

Gestiona la carga y el estado de procesamiento del PDF (fases posteriores).

```text
resultado.js
```

Gestiona la visualización del resultado final (fases posteriores).

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

> **Estado actual:** `mockData` vive en `public/js/app.js` como estructura de referencia. Dashboard, Hallazgo, Paso 1 y Paso 2 ya usan datos reales del endpoint `/api/pdf/subir.php`; `mockData` se mantiene como fallback/plantilla para los módulos aún simulados (usuarios, procesos, resultado PDF final). No eliminar mientras existan módulos sin backend real.

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
procesamiento/hallazgo/hallazgo.html
 ↓
procesamiento/paso2/paso2.html
 ↓
historial.html
```

El flujo de procesamiento (con el endpoint real) es:

```text
dashboard (dropzone)
 ↓
subir.php (post /api/pdf)
 ↓
hallazgo (ficha resumida)
 ↓
paso2 (validación del técnico)
 ↓
resultado (futuro)
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

> **Estado actual:** el Dashboard incluye el dropzone que envía el PDF a `/api/pdf/subir.php` y redirige a `procesamiento/hallazgo/hallazgo.html`.

---

## FASE 4 — Subir PDF

Crear:

* Área de carga.
* Drag & Drop.
* Selector de archivo.
* Información del archivo.
* Botón "Procesar PDF".

> **Estado actual:** en lugar de una página separada `subir-pdf.html`, la subida vive en el Dashboard (dropzone). El procesamiento real se ejecuta en `/api/pdf/subir.php` y la ficha del resultado se muestra en `procesamiento/hallazgo/hallazgo.html`. Mantener esta integración ya que es funcional.

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

El procesamiento real del PDF está **implementado** en `public/api/pdf/`.

## Backend de procesamiento PDF

```text
public/api/
├── config.php            → rutas de binarios Poppler + Tesseract
└── pdf/
    ├── subir.php         → endpoint HTTP (POST multipart/form-data, campo "archivo")
    ├── PdfProcessor.php  → orquesta todo el flujo de extracción
    └── tmp/              → archivos temporales (NO versionar)
```

Tecnologías:

```text
PHP
Poppler (pdftotext, pdftoppm, pdfimages, pdfinfo)
Tesseract OCR + idioma español (spa)
```

El flujo de detección es:

```text
PDF
 ↓
pdftotext
 ↓
¿Hay capa de texto suficiente?
 │
 ├── Sí
 │    ↓
 │ pdftotext -bbox   → texto con coordenadas por palabra
 │    ↓
 │ texto + coordenadas
 │
 └── No (escaneado)
      ↓
   pdftoppm -png -r 200
      ↓
   Tesseract OCR (spa) por página
      ↓
   texto base (página completa)
      ↓
   Segundo pase: OCR por bandas (r 300, recortes sup 0–50% e inf 50–100%)
      ↓
   Completa los campos del hallazgo que el OCR base omitió
      ↓
     texto
```

### Pase OCR por bandas (documentos escaneados)

El OCR de página completa omite ciertas secciones del formulario (p. ej. las etiquetas "VULNERABILIDADES DE INFRAESTRUCTURA" y "ESTADO DE INFRAESTRUCTURA", que sí se leen cuando el recorte ocupa la banda). Por eso, en escaneados se ejecuta un segundo pase (`PdfProcessor::ocrPorBandas()`) que renderiza cada página a 300 DPI en dos bandas horizontales sin solape (0–50% y 50–100%) y aplica Tesseract por banda. La extracción de campos sobre ese texto complementario se fusiona con `fusionarHallazgos()`: solo completa los campos que quedaron vacíos en la extracción base, sin reemplazar los valores ya detectados.

Posteriormente:

```text
Localizar sección "REGISTRO FOTOGRÁFICO"
 ↓
pdfimages -list  → inventario de imágenes por página
 ↓
Identificar la primera imagen correspondiente a la sección
 ↓
pdfimages -png   → extraer la imagen
 ↓
Extraer campos estructurados del formulario de hallazgos
 ↓
Devolver resultado al frontend (JSON)
```

### Detección de PDF escaneado

`PdfProcessor::esEscaneado()` ejecuta `pdftotext` y, si el texto plano tiene menos de 20 caracteres, considera el documento escaneado y aplica OCR por página.

### Normalización de codificación

`PdfProcessor::normalizarTexto()` corrige la salida de Tesseract `pdftotext` cuando no es UTF-8 válido (p. ej. bytes de Windows-1252): si `preg_match('//u')` falla, se convierte de Windows-1252 a UTF-8.

### Extracción estructurada del hallazgo

`PdfProcessor::extraerHallazgo(array $texto)` parsea el formulario fijo del documento a partir del texto extraído (etiqueta seguida de su valor). Las etiquetas se declaran en `CAMPOS_ETIQUETAS` (con acentos y variantes para tolerar diferencias de OCR) y su orden de aparición en `CAMPOS_ORDEN`.

Campos devueltos:

```text
fechaHora, quienReporta, aliado, regional, departamento, listaMunicipios,
municipio, barrio, direccion, puntoReferencia, coordenadas,
duenoInfraestructura, codigoPacvi, vulnerabilidadesInfraestructura,
estadoInfraestructura, vulnerabilidad, asociarOT, prioridad, observaciones
```

* `vulnerabilidadesInfraestructura` → etiqueta "VULNERABILIDADES DE INFRAESTRUCTURA".
* `estadoInfraestructura` → etiqueta "ESTADO DE INFRAESTRUCTURA (TAPA/RECÁMARA)"; el valor es el nivel de deterioro indicado. La instrucción "INDIQUE EL NIVEL DE DETERIORO" se elimina del valor con `limpiarValorEstadoInfraestructura()`.

El emparejamiento compara cada línea normalizada (mayúsculas + sin acentos, reutilizando `normalizar()`) contra el inicio de la etiqueta, tolerando sobras de OCR (p. ej. "CODIGO PACVI S"). Los valores vacíos se devuelven como `""`. El resultado viaja en la clave `hallazgo` de la respuesta.

### Formato de respuesta

`subir.php` devuelve JSON con la estructura:

```text
{
  "ok": true,
  "archivo": "...",
  "escaneado": true|false,
  "paginas": N,
  "texto": ["página 1", "página 2", ...],
  "coordenadas": [...],
  "registro": { "page": N, ... } | null,
  "hallazgo": { "fechaHora": "...", "direccion": "...", ... },
  "imagen": { "original": ..., "extraida": ..., "ruta_abs": ..., "url": ... },
  "archivo_original": "..."
}
```

El `json_encode` de la respuesta se emite con `JSON_INVALID_UTF8_SUBSTITUTE` para no romper el frontend si algún byte residual del OCR no es UTF-8 válido.

### Archivos temporales

Todos los archivos generados durante el procesamiento (PDFs subidos, PNG de OCR, imágenes extraídas) se almacenan en `public/api/tmp/`. **Estos archivos NO deben versionarse** (ver sección .gitignore).

### Dependencias de binarios

* Poppler: detectado vía `config.php` (override `POPPLER_BIN`, instalación winget de Windows o PATH del sistema).
* Tesseract: detectado vía `config.php` (`TESSERACT_BIN`, `Program Files\Tesseract-OCR` o PATH). Se requiere el idioma `spa` instalado.
* `main.py` arranca `php -S` para servir los endpoints además de los estáticos.

### Configuración local (desarrollo Windows)

* Poppler instalado por winget: `oschwartz10612.Poppler_Microsoft.Winget.Source...`.
* Tesseract instalado en `C:\Program Files\Tesseract-OCR\` con `spa.traineddata`.

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

Cuando el resto de módulos supere el prototipo visual, se podrá implementar:

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
/api/pdf/        → ya implementado para el procesamiento (subir + PdfProcessor)
/api/procesos/
/api/excel/
```

El endpoint `/api/pdf/subir.php` **ya existe y es funcional**. El resto de endpoints no debe crearse durante la etapa visual (mientras autenticación, sesiones, persistencia y Excel sigan siendo simulados o futuros).

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

---

# 27. Layout de aplicación y menú hamburguesa (estilo reutilizable)

Todas las páginas internas (Dashboard, Subir PDF, Procesando, Paso 1, Paso 2, Resultado, Historial, Administración) deben reutilizar el mismo layout de aplicación y el mismo menú lateral.

> **Estado actual del menú:** mientras Historial y Administración no tengan páginas reales, el sidebar debe contener únicamente **Dashboard** y **Procesamiento**. Los enlaces a `historial.html` y `usuarios.html` se agregan cuando esas páginas existan.

## 27.1 Estructura HTML

```text
body.app-body
├── aside.sidebar#sidebar               → menú lateral (columna fija en escritorio, drawer en móvil)
│   ├── div.sidebar-brand
│   │   ├── span.brand-kicker           → texto "Menú" (solo visible en móvil)
│   │   ├── img.sidebar-logo            → logo (oculto en móvil)
│   │   └── button#btn-sidebar-close    → botón X (solo visible en móvil)
│   ├── nav.sidebar-nav
│   │   ├── p.nav-section               → etiqueta de sección
│   │   └── a.nav-link                  → enlace; usar class "active" en la página actual
│   └── div.sidebar-footer
│       ├── div.sidebar-user            → avatar + nombre + rol
│       └── button#logout-btn.btn-logout
├── div.sidebar-backdrop#sidebar-backdrop   → fondo oscurecido con blur (móvil)
└── div.app-main
    ├── header.topbar
    │   ├── button#btn-toggle-sidebar.btn-toggle-sidebar   → hamburguesa (solo móvil)
    │   └── div                         → título y subtítulo de la página
    └── main.content
```

## 27.2 Archivos requeridos

Cada ventana interna enlaza, en este orden:

```text
css/variables.css
css/base.css
css/components.css
css/layout.css   → todo el estilo del layout, sidebar, topbar y backdrop vive aquí
```

Y al final del body:

```text
js/app.js   → inicializa el menú automáticamente (App.iniciarLayout)
js/<js de la página>.js
```

No se requiere CSS adicional por página para el menú.

## 27.3 Comportamiento JS (centralizado en app.js)

* Abrir/cerrar: clic en `#btn-toggle-sidebar` alterna la clase `sidebar-open` en `body`.
* Cerrar: botón X (`#btn-sidebar-close`), clic en el backdrop (`#sidebar-backdrop`), clic en cualquier enlace del menú o tecla `Escape`.
* La clase `body.sidebar-open` controla la visibilidad del drawer y del backdrop en móvil.
* `App.iniciarLayout()` se ejecuta solo si la página contiene `#sidebar`.

## 27.4 Diseño móvil (≤ 900px)

* Sidebar = drawer glass: `width: min(310px, 82vw)`, esquinas redondeadas a la derecha, gradiente azul con destello radial, sombra profunda (relieve).
* Backdrop con desenfoque: `backdrop-filter: blur(3px)`.
* En móvil el logo se oculta, se muestra "Menú" como etiqueta y el botón X circular de cristal.
* En escritorio (> 900px) la sidebar es una columna fija; "Menú" y la X quedan ocultos.

---

# 28. Gestión de archivos temporales, .gitignore y scripts de prueba

## .gitignore

El repositorio raíz cuenta con un `.gitignore` que excluye, como mínimo:

```text
public/api/tmp/**          → archivos temporales del procesamiento PDF
*.tmp
*.temp
*.log
.DS_Store
Thumbs.db
```

Todos los archivos generados por el procesamiento (PDFs subidos, PNG de OCR, imágenes extraídas) viven en `public/api/tmp/` y **nunca se versionan**.

## Scripts de prueba del PDF

Los generadores de PDF de prueba viven en `tests/fixtures/pdf/` y **no** forman parte de la API de producción:

```text
tests/fixtures/pdf/
├── generar_prueba.php        → genera un PDF de texto simple (prueba pdftotext)
└── generar_prueba_imagen.php → genera un PDF con texto + imagen (prueba pdfimages)
```

Se ejecutan con PHP CLI y escriben su salida en `public/api/tmp/` para poder probar el pipeline real.

---

# 29. Subida masiva de PDFs (carpeta)

## Regla de extracción
Los PDFs de un lote comparten SIEMPRE la misma estructura de extracción (el formulario
fijo de hallazgos de la sección 17). Todos se procesan con el mismo pipeline y las mismas
etiquetas (`CAMPOS_ETIQUETAS` / `CAMPOS_ORDEN`). No debe asumirse otra estructura por archivo.

## Requisito
Subir una CARPETA con todos los PDFs juntos (o varios PDFs a la vez) y procesarlos
secuencialmente. Flujo:

1. Dropzone del Dashboard permite elegir carpeta (input `multiple` + `webkitdirectory`)
   o varios archivos. Se filtran solo `.pdf`.
2. La tarjeta del archivo muestra el conteo: "N PDFs".
3. Se procesan UNO A LA VEZ contra `/api/pdf/subir.php` (no hay endpoint de lote;
   se reutiliza el flujo unitario).
4. Modal de progreso: anillo reiniciado por archivo, subtítulo "Archivo X de N" +
   nombre del archivo + fase ("Subiendo...", "Procesando PDF...").
5. Una falla por archivo NO detiene el lote: se marca como error y continúa.
6. Al terminar: resumen en el modal con lista scrolleable:
   `✓ nombre.pdf` → clic guarda ese resultado como proceso actual y abre hallazgo.
   `✕ nombre.pdf` → motivo del error.
   Botón "Cerrar" para volver al dropzone vacío.
7. La X cancela el lote completo y limpia resultados parciales.

## Límites y reglas de no romper
- Resultados guardados en `sessionStorage` (`autn_lote_actual` + `autn_proceso_actual`).
  TOPE del lote: 20 PDFs (~5MB de sessionStorage). Más requiere persistencia real (futuro).
- NO borrar archivos de `public/api/tmp/` durante el lote: las imágenes extraídas viven ahí
  y hallazgo las referencia (persistencia es fase posterior).
- No crear endpoint de lote, colas ni BD (ver sección 20).

## Estado actual
La subida es UNITARIA (un PDF a la vez). Subida masiva por carpeta está documentada,
NO implementada.
