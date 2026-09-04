# AUTN TANIA

# Sistema de Procesamiento de PDF y Generación de Excel

Aplicación web orientada a la carga, procesamiento y organización de información contenida en archivos PDF. El sistema permite extraer los datos relevantes del documento, identificar y almacenar el registro fotográfico correspondiente y generar un archivo Excel estructurado a partir de la información obtenida.

La aplicación contará con autenticación de usuarios, diferentes niveles de acceso, historial de procesos y una interfaz sencilla para gestionar todo el flujo de procesamiento.

## Objetivo

Facilitar y automatizar el proceso de pasar información contenida en documentos PDF a un formato estructurado y reutilizable, reduciendo el trabajo manual y manteniendo organizados los documentos, imágenes y resultados generados.

## Stack tecnológico

* HTML5
* CSS3 Vanilla
* JavaScript Vanilla
* Fetch API / AJAX
* Google Fonts — Barlow
* SVG
* PHP 8.1+
* PHP Sessions
* PDO
* MySQL / MariaDB
* Procesamiento de PDF
* Imagick / ImageMagick
* Tesseract OCR, cuando sea necesario
* SimpleXLSXGen para generación de archivos Excel
* Git

## Flujo principal

```text
PDF
 ↓
Carga del documento
 ↓
Procesamiento
 ↓
Extracción de información
 ↓
Identificación del registro fotográfico
 ↓
Almacenamiento de la imagen
 ↓
Organización de los datos
 ↓
Generación del Excel
 ↓
Descarga del resultado
```

El proyecto se desarrollará inicialmente como un prototipo de interfaz y funcionamiento básico, para posteriormente integrar el procesamiento real de documentos y la persistencia de la información.

