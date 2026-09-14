-- Tablas propias de AUTN TANIA dentro de la BD compartida u510981418_horasextra.
-- Reutiliza catalogos existentes: usuarios(id_usuario), estado(id_estado).

CREATE TABLE IF NOT EXISTS pdf_procesos (
    id_proceso VARCHAR(64) NOT NULL,
    consecutivo VARCHAR(10) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    archivo_original VARCHAR(255) DEFAULT NULL,
    escaneado TINYINT(1) NOT NULL DEFAULT 0,
    paginas INT DEFAULT NULL,
    id_usuario_creador INT DEFAULT NULL,
    id_estado INT NOT NULL DEFAULT 1,
    asignado_a_id_usuario INT DEFAULT NULL,
    confirmado TINYINT(1) NOT NULL DEFAULT 0,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    fecha_confirmacion DATETIME DEFAULT NULL,
    imagen_url VARCHAR(255) DEFAULT NULL,
    registro_pagina INT DEFAULT NULL,
    registro_x DECIMAL(10,2) DEFAULT NULL,
    registro_y_min DECIMAL(10,2) DEFAULT NULL,
    registro_y_max DECIMAL(10,2) DEFAULT NULL,
    texto_extraido LONGTEXT,
    PRIMARY KEY (id_proceso),
    UNIQUE KEY uq_pdf_procesos_consecutivo (consecutivo),
    KEY idx_pdf_procesos_creador (id_usuario_creador),
    KEY idx_pdf_procesos_asignado (asignado_a_id_usuario),
    KEY idx_pdf_procesos_estado (id_estado),
    CONSTRAINT fk_pdf_procesos_creador FOREIGN KEY (id_usuario_creador) REFERENCES usuarios (id_usuario),
    CONSTRAINT fk_pdf_procesos_asignado FOREIGN KEY (asignado_a_id_usuario) REFERENCES usuarios (id_usuario),
    CONSTRAINT fk_pdf_procesos_estado FOREIGN KEY (id_estado) REFERENCES estado (id_estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pdf_hallazgo_datos (
    id_proceso VARCHAR(64) NOT NULL,
    quien_reporta VARCHAR(150) DEFAULT NULL,
    fecha_hora VARCHAR(50) DEFAULT NULL,
    aliado VARCHAR(150) DEFAULT NULL,
    regional VARCHAR(150) DEFAULT NULL,
    departamento VARCHAR(150) DEFAULT NULL,
    municipio VARCHAR(150) DEFAULT NULL,
    barrio VARCHAR(150) DEFAULT NULL,
    direccion VARCHAR(255) DEFAULT NULL,
    punto_referencia VARCHAR(255) DEFAULT NULL,
    coordenadas VARCHAR(100) DEFAULT NULL,
    dueno_infraestructura VARCHAR(150) DEFAULT NULL,
    codigo_pacvi VARCHAR(100) DEFAULT NULL,
    vulnerabilidades_infraestructura TEXT,
    estado_infraestructura VARCHAR(150) DEFAULT NULL,
    vulnerabilidad VARCHAR(150) DEFAULT NULL,
    asociar_ot VARCHAR(100) DEFAULT NULL,
    prioridad VARCHAR(100) DEFAULT NULL,
    observaciones TEXT,
    PRIMARY KEY (id_proceso),
    CONSTRAINT fk_pdf_hallazgo_proceso FOREIGN KEY (id_proceso) REFERENCES pdf_procesos (id_proceso) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pdf_fase2_datos (
    id_proceso VARCHAR(64) NOT NULL,
    supervisor VARCHAR(150) DEFAULT NULL,
    wo VARCHAR(100) DEFAULT NULL,
    tecnico VARCHAR(150) DEFAULT NULL,
    estado_v VARCHAR(100) DEFAULT NULL,
    observaciones TEXT,
    tiene_foto TINYINT(1) NOT NULL DEFAULT 0,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_proceso),
    CONSTRAINT fk_pdf_fase2_proceso FOREIGN KEY (id_proceso) REFERENCES pdf_procesos (id_proceso) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pdf_evidencias (
    id_evidencia INT NOT NULL AUTO_INCREMENT,
    id_proceso VARCHAR(64) NOT NULL,
    tipo VARCHAR(30) NOT NULL DEFAULT 'foto',
    ruta MEDIUMTEXT NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_evidencia),
    KEY idx_pdf_evidencias_proceso (id_proceso),
    CONSTRAINT fk_pdf_evidencias_proceso FOREIGN KEY (id_proceso) REFERENCES pdf_procesos (id_proceso) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
