# AUTN TANIA

# ⚙️ Información General

- **Nombre del Proyecto:** AUTN TANIA — Sistema de Procesamiento de PDF y Generación de Excel
- **Tipo de Desarrollo:** Aplicación web (frontend + backend) para carga, procesamiento y extracción de información de PDFs de hallazgos
- **Versión:** 1.0
- **Fecha de inicio:** 2026-09-04
- **Fechas estimadas de cierre:** Por definir
- **Responsable Técnico:** Andres Valencia
- **Solicitante:** Tania y Danny
- **Sitios o Sedes Implicadas:** Cali, Neiva

---

# 💾 Alcance Técnico

- **Descripción Básica:** Sistema web que recibe archivos PDF de formularios de hallazgo, procesa el documento (incluido OCR para PDFs escaneados), extrae de forma estructurada los campos del formulario, identifica y almacena el registro fotográfico, y permite la validación técnica y el seguimiento del proceso hasta la generación de un Excel estructurado.
- **Objetivo general:** Automatizar la conversión de información contenida en PDFs de hallazgos en datos estructurados y reutilizables, reduciendo el trabajo manual y manteniendo organizados documentos, imágenes y resultados.
- **Objetivos específicos:**
  - Procesar PDFs (texto y escaneados con OCR) y extraer los 19 campos del formulario de hallazgo.
  - Detectar, extraer y visualizar el registro fotográfico del documento.
  - Persistir procesos, hallazgos y validaciones del técnico en base de datos.
  - Gestionar acceso por roles (ADMIN / USUARIO) con autenticación real.
  - Generar el Excel estructurado final (pendiente).
- **Lenguajes / Frameworks:** PHP 8.1+ (puro), HTML5, CSS3 Vanilla, JavaScript Vanilla, Fetch API. Sin frameworks.
- **Base de datos:** MySQL 5.7+ / MariaDB 10.3+ (BD compartida `u510981418_horasextra`, tablas propias `pdf_*`).
- **Infraestructura:** XAMPP (Apache + PHP) en Windows; procesamiento con binarios Poppler y Tesseract OCR.
- **Entorno de desarrollo:** Local con XAMPP en `htdocs/` (no se usa servidor de desarrollo aparte).
- **Integraciones:** Poppler (`pdftotext`, `pdftoppm`, `pdfimages`, `pdfinfo`), Tesseract OCR (idioma `spa`), SimpleXLSXGen (Excel, pendiente).
- **Protocolos de seguridad:** `password_hash()` / `password_verify()`, PDO con consultas preparadas, `JSON_INVALID_UTF8_SUBSTITUTE`, validación de archivos subidos, roles y permisos por tipo de usuario.

---

# 📋 Estructura funcional

## Arquitectura y acceso

| Descripción | Estatus |
| --- | --- |
| Login con autenticación real contra BD compartida (cédula + contraseña) | Implementado |
| Perfiles ADMIN y USUARIO con navegación y acciones según rol | Implementado |
| Layout de aplicación con sidebar (drawer en móvil) y topbar reutilizable | Implementado |
| Dashboard con estadísticas, procesos recientes y dropzone de subida | Implementado |
| Registro de nuevos usuarios | Pendiente |
| Módulo de administración de usuarios | Pendiente |

## Registro fotográfico

| Descripción | Estatus |
| --- | --- |
| Localización de la sección "REGISTRO FOTOGRÁFICO" en el PDF | Implementado |
| Inventario de imágenes por página y extracción de la primera imagen de la sección | Implementado |
| Almacenamiento y visualización de la imagen extraída | Implementado |
| Registro de evidencias en base de datos (tabla `pdf_evidencias`) | Implementado |

## Geolocalización

| Descripción | Estatus |
| --- | --- |
| Extracción del campo coordenadas del formulario de hallazgo | Implementado |
| Validación del formato de coordenadas (grados/minutos/segundos) en la extracción | Implementado |
| Visualización en mapa interactivo | Pendiente |

## Base de datos & backend

| Descripción | Estatus |
| --- | --- |
| Conexión PDO desde `.env` (BD compartida `u510981418_horasextra`) | Implementado |
| Esquema de tablas propias (`pdf_procesos`, `pdf_hallazgo_datos`, `pdf_fase2_datos`, `pdf_evidencias`) | Implementado |
| Endpoint de procesamiento PDF `/api/pdf/subir.php` | Implementado |
| CRUD de procesos/hallazgo/fase2 `/api/pdf/procesos.php` | Implementado |
| Historial persistido en BD (reemplaza datos simulados) | Implementado |
| Subida masiva de PDFs por carpeta (lote hasta 20 PDFs) | Pendiente (documentado) |
| Generación real de Excel con SimpleXLSXGen | Pendiente |

---

# 🌏 Entorno Entregas

| Título | Propietario | Fecha de destino | Fase | Lista de comprobación | Notas |
| --- | --- | --- | --- | --- | --- |
| Login | Andres Valencia | 2026-09-04 | Fase 1 | Autenticación real (BD), roles ADMIN/USUARIO, responsive | Entregado |
| Dashboard y subida de PDF | Andres Valencia | 2026-09-04 | Fase 3 | Layout de app, sidebar, dropzone, estadísticas | Entregado |
| Procesamiento PDF + OCR | Andres Valencia | 2026-09-08 | Fase 5 | Poppler, Tesseract `spa`, progreso real, coordenadas | Entregado |
| Hallazgo / Paso 1 / Paso 2 | Andres Valencia | 2026-09-11 | Fase 6 | Ficha del hallazgo, extracción estructurada, validación del técnico | Entregado |
| Resultado | Andres Valencia | 2026-09-14 | Fase 6 | Cards por rol según fase validada, modal de completado | Entregado |
| Historial con persistencia en BD | Andres Valencia | 2026-09-14 | Fase 7 | CRUD procesos, asignación de técnico, estado V | Entregado |
| Generación de Excel (SimpleXLSXGen) | Andres Valencia | Por definir | Posterior | — | Pendiente |
| Administración de usuarios / Registro | Andres Valencia | Por definir | Fase 8-9 | — | Pendiente |