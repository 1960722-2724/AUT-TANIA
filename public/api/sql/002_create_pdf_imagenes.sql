-- Tabla unificada de imágenes de AUTN TANIA.
--
-- Reemplaza los dos mecanismos anteriores:
--   * la columna pdf_procesos.imagen_url   (imagen extraída del PDF)
--   * la tabla  pdf_evidencias             (foto móvil del paso 2)
--
-- Estructura preparada para admitir más tipos de imagen a futuro:
--   tipo 'pdf'   → registro fotográfico extraído del documento.
--   tipo 'movil' → foto tomada en el paso 2 (registro fotográfico digital).
-- La columna etiqueta guarda el detalle/descripción de cada imagen.

CREATE TABLE IF NOT EXISTS pdf_imagenes (
    id_imagen  INT NOT NULL AUTO_INCREMENT,
    id_proceso VARCHAR(64) NOT NULL,
    tipo       VARCHAR(30)  NOT NULL,
    etiqueta   VARCHAR(150) DEFAULT NULL,
    ruta       MEDIUMTEXT   NOT NULL,
    pagina     INT          DEFAULT NULL,
    mime       VARCHAR(50)  DEFAULT NULL,
    ancho      INT          DEFAULT NULL,
    alto       INT          DEFAULT NULL,
    peso       INT          DEFAULT NULL,
    orden      INT NOT NULL DEFAULT 0,
    creado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_imagen),
    KEY idx_pdf_imagenes_proceso (id_proceso),
    CONSTRAINT fk_pdf_imagenes_proceso
        FOREIGN KEY (id_proceso) REFERENCES pdf_procesos (id_proceso) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
o   ejecuta 
-- 1. Migrar la imagen extraída del PDF (pdf_procesos.imagen_url) -> tipo 'pdf'
INSERT INTO pdf_imagenes (id_proceso, tipo, etiqueta, ruta, pagina, orden)
SELECT
    id_proceso,
    'pdf',
    'Registro fotografico extraido del PDF',
    imagen_url,
    registro_pagina,
    0
FROM pdf_procesos
WHERE imagen_url IS NOT NULL AND imagen_url <> '';

-- 2. Migrar las evidencias existentes (pdf_evidencias) -> mismo tipo + etiqueta
INSERT INTO pdf_imagenes (id_proceso, tipo, etiqueta, ruta, orden)
SELECT
    id_proceso,
    tipo,
    CASE tipo
        WHEN 'movil' THEN 'Registro fotografico digital (paso 2)'
        ELSE CONCAT('Evidencia ', tipo)
    END,
    ruta,
    1
FROM pdf_evidencias;

-- 3. Reemplazo: eliminar los mecanismos antiguos.
-- MariaDB 10.0+ soporta DROP TABLE IF EXISTS y DROP COLUMN IF EXISTS.
-- En MySQL 5.7/8.0 la columna imagen_url puede eliminarse manualmente:
--   ALTER TABLE pdf_procesos DROP COLUMN imagen_url;
DROP TABLE IF EXISTS pdf_evidencias;