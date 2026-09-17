<?php

declare(strict_types=1);

require_once __DIR__ . '/../db.php';

/**
 * Endpoint HTTP CRUD de procesos (reemplaza el historial en localStorage).
 *
 * GET    ?id=<id>        -> un proceso con hallazgo y fase2
 * GET    (sin id)        -> lista todos los procesos (sin detalle)
 * POST                   -> crea un proceso (body JSON)
 * POST   ?id=<id>&_method=PUT    -> actualiza proceso / hallazgo / fase2
 * DELETE ?id=<id>        -> elimina un proceso
 */

header('Content-Type: application/json; charset=utf-8');

function responderJson(array $datos, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function leerBodyJson(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $datos = json_decode($raw, true);
    return is_array($datos) ? $datos : [];
}

/**
 * Inserta imágenes de un proceso en la tabla unificada pdf_imagenes.
 *
 * @param array<int,array<string,mixed>> $imagenes
 */
function insertarImagenes(PDO $pdo, string $idProceso, array $imagenes): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO pdf_imagenes (id_proceso, tipo, etiqueta, ruta, pagina, mime, ancho, alto, peso, orden)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $pasadas = array_values($imagenes);
    foreach ($pasadas as $indice => $im) {
        $stmt->execute([
            $idProceso,
            $im['tipo'] ?? 'pdf',
            $im['etiqueta'] ?? null,
            $im['ruta'] ?? ($im['url'] ?? null),
            $im['pagina'] ?? null,
            $im['mime'] ?? null,
            $im['ancho'] ?? null,
            $im['alto'] ?? null,
            $im['peso'] ?? null,
            (int) ($im['orden'] ?? $indice),
        ]);
    }
}

/**
 * Normaliza un conjunto de filas de pdf_imagenes a los campos del frontend:
 * imagen (1ª tipo 'pdf'), imagenes (completo) y evidencias (rutas tipo 'movil').
 *
 * @param array<int,array<string,mixed>> $imagenes
 */
function aplicarImagenes(array &$proceso, array $imagenes): void
{
    $proceso['imagenes'] = $imagenes;
    $proceso['imagen'] = null;
    foreach ($imagenes as $im) {
        if (($im['tipo'] ?? '') === 'pdf') {
            $proceso['imagen'] = ['url' => $im['ruta']] + $im;
            break;
        }
    }
    if ($proceso['imagen'] === null && !empty($imagenes)) {
        $im = $imagenes[0];
        $proceso['imagen'] = ['url' => $im['ruta']] + $im;
    }
    $evidencias = [];
    foreach ($imagenes as $im) {
        if (($im['tipo'] ?? '') === 'movil') {
            $evidencias[] = $im['ruta'];
        }
    }
    $proceso['evidencias'] = $evidencias;
}

function siguienteConsecutivo(PDO $pdo): string
{
    $stmt = $pdo->query('SELECT consecutivo FROM pdf_procesos');
    $max = 0;
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $consecutivo) {
        $n = (int) $consecutivo;
        if ($n > $max) {
            $max = $n;
        }
    }
    return str_pad((string) ($max + 1), 4, '0', STR_PAD_LEFT);
}

function obtenerProcesoCompleto(PDO $pdo, string $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM pdf_procesos WHERE id_proceso = ?');
    $stmt->execute([$id]);
    $proceso = $stmt->fetch();
    if (!$proceso) {
        return null;
    }

    $stmt = $pdo->prepare('SELECT * FROM pdf_hallazgo_datos WHERE id_proceso = ?');
    $stmt->execute([$id]);
    $hallazgo = $stmt->fetch() ?: null;

    $stmt = $pdo->prepare('SELECT * FROM pdf_fase2_datos WHERE id_proceso = ?');
    $stmt->execute([$id]);
    $fase2 = $stmt->fetch() ?: null;

    $stmt = $pdo->prepare('SELECT id_imagen, tipo, etiqueta, ruta, pagina, mime, ancho, alto, peso FROM pdf_imagenes WHERE id_proceso = ? ORDER BY orden, id_imagen');
    $stmt->execute([$id]);
    $imagenes = $stmt->fetchAll();

    $proceso['hallazgo'] = $hallazgo;
    $proceso['fase2'] = $fase2;
    aplicarImagenes($proceso, $imagenes);
    $proceso['registro'] = $proceso['registro_pagina'] !== null ? [
        'page' => (int) $proceso['registro_pagina'],
        'x' => $proceso['registro_x'] !== null ? (float) $proceso['registro_x'] : null,
        'yMin' => $proceso['registro_y_min'] !== null ? (float) $proceso['registro_y_min'] : null,
        'yMax' => $proceso['registro_y_max'] !== null ? (float) $proceso['registro_y_max'] : null,
    ] : null;
    $proceso['texto'] = $proceso['texto_extraido'] ? (json_decode($proceso['texto_extraido'], true) ?: []) : [];

    $proceso['asignado_a'] = null;
    if ($proceso['asignado_a_id_usuario']) {
        $stmt = $pdo->prepare('SELECT id_usuario AS id, n_completo AS nombre, cedula FROM usuarios WHERE id_usuario = ?');
        $stmt->execute([$proceso['asignado_a_id_usuario']]);
        $proceso['asignado_a'] = $stmt->fetch() ?: null;
    }

    return $proceso;
}

function listarProcesos(PDO $pdo, string $whereSql = '', array $params = []): array
{
    $stmt = $pdo->prepare("SELECT * FROM pdf_procesos {$whereSql} ORDER BY creado_en DESC");
    $stmt->execute($params);
    $procesos = $stmt->fetchAll();
    if (!$procesos) {
        return [];
    }

    $ids = array_column($procesos, 'id_proceso');
    $marcadores = implode(',', array_fill(0, count($ids), '?'));

    $stmt = $pdo->prepare("SELECT * FROM pdf_hallazgo_datos WHERE id_proceso IN ({$marcadores})");
    $stmt->execute($ids);
    $hallazgos = [];
    foreach ($stmt->fetchAll() as $h) {
        $hallazgos[$h['id_proceso']] = $h;
    }

    $stmt = $pdo->prepare("SELECT * FROM pdf_fase2_datos WHERE id_proceso IN ({$marcadores})");
    $stmt->execute($ids);
    $fases2 = [];
    foreach ($stmt->fetchAll() as $f) {
        $fases2[$f['id_proceso']] = $f;
    }

    $asignados = [];
    $userIds = array_filter(array_unique(array_column($procesos, 'asignado_a_id_usuario')));
    if ($userIds) {
        $marcUser = implode(',', array_fill(0, count($userIds), '?'));
        $stmt = $pdo->prepare("SELECT id_usuario, n_completo AS nombre, cedula FROM usuarios WHERE id_usuario IN ({$marcUser})");
        $stmt->execute(array_values($userIds));
        foreach ($stmt->fetchAll() as $u) {
            $asignados[$u['id_usuario']] = $u;
        }
    }

    $imagenesPorProceso = [];
    $stmt = $pdo->prepare("SELECT id_imagen, id_proceso, tipo, etiqueta, ruta, pagina, mime, ancho, alto, peso FROM pdf_imagenes WHERE id_proceso IN ({$marcadores}) ORDER BY orden, id_imagen");
    $stmt->execute($ids);
    foreach ($stmt->fetchAll() as $im) {
        $imagenesPorProceso[$im['id_proceso']][] = $im;
    }

    foreach ($procesos as &$p) {
        $p['hallazgo'] = $hallazgos[$p['id_proceso']] ?? null;
        $p['fase2'] = $fases2[$p['id_proceso']] ?? null;
        aplicarImagenes($p, $imagenesPorProceso[$p['id_proceso']] ?? []);
        $p['asignado_a'] = $p['asignado_a_id_usuario'] ? ($asignados[$p['asignado_a_id_usuario']] ?? null) : null;
    }
    unset($p);

    return $procesos;
}

$camposHallazgo = [
    'quien_reporta', 'fecha_hora', 'aliado', 'regional', 'departamento', 'municipio', 'barrio',
    'direccion', 'punto_referencia', 'coordenadas', 'dueno_infraestructura', 'codigo_pacvi',
    'vulnerabilidades_infraestructura', 'estado_infraestructura', 'vulnerabilidad', 'asociar_ot',
    'prioridad', 'observaciones',
];

$camposFase2 = ['supervisor', 'wo', 'tecnico', 'estado_v', 'observaciones', 'tiene_foto'];

try {
    $pdo = dbConectar();
    $metodo = $_SERVER['REQUEST_METHOD'];
    $id = isset($_GET['id']) ? (string) $_GET['id'] : null;

    if ($metodo === 'GET') {
        if ($id) {
            $proceso = obtenerProcesoCompleto($pdo, $id);
            if (!$proceso) {
                responderJson(['ok' => false, 'error' => 'Proceso no encontrado.'], 404);
            }
            responderJson(['ok' => true, 'proceso' => $proceso]);
        }

        if (isset($_GET['asignado_a'])) {
            responderJson(['ok' => true, 'procesos' => listarProcesos($pdo, 'WHERE asignado_a_id_usuario = ?', [$_GET['asignado_a']])]);
        }

        responderJson(['ok' => true, 'procesos' => listarProcesos($pdo)]);
    }

    if ($metodo === 'POST') {
        $body = leerBodyJson();
        $accion = $body['_accion'] ?? 'crear';

        if ($accion === 'crear') {
            $idProceso = $body['id_proceso'] ?? ('proc_' . bin2hex(random_bytes(6)));
            $consecutivo = $body['consecutivo'] ?? siguienteConsecutivo($pdo);

            $stmt = $pdo->prepare(
                'INSERT INTO pdf_procesos
                    (id_proceso, consecutivo, nombre_archivo, archivo_original, escaneado, paginas,
                     id_usuario_creador, id_estado, asignado_a_id_usuario, confirmado,
                     registro_pagina, registro_x, registro_y_min, registro_y_max, texto_extraido)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $registro = $body['registro'] ?? [];
            $stmt->execute([
                $idProceso,
                $consecutivo,
                $body['nombre_archivo'] ?? 'Sin nombre',
                $body['archivo_original'] ?? null,
                !empty($body['escaneado']) ? 1 : 0,
                $body['paginas'] ?? null,
                $body['id_usuario_creador'] ?? null,
                $body['id_estado'] ?? 1,
                $body['asignado_a_id_usuario'] ?? null,
                0,
                $registro['page'] ?? null,
                $registro['x'] ?? null,
                $registro['yMin'] ?? null,
                $registro['yMax'] ?? null,
                isset($body['texto']) ? json_encode($body['texto'], JSON_UNESCAPED_UNICODE) : null,
            ]);

            $imagenes = $body['imagenes'] ?? [];
            if (empty($imagenes) && !empty($body['imagen']['url'])) {
                $imagenes[] = [
                    'tipo' => 'pdf',
                    'etiqueta' => 'Registro fotografico extraido del PDF',
                    'ruta' => $body['imagen']['url'],
                    'pagina' => $registro['page'] ?? null,
                ];
            }
            if ($imagenes) {
                insertarImagenes($pdo, $idProceso, $imagenes);
            }

            if (!empty($body['hallazgo']) && is_array($body['hallazgo'])) {
                $columnas = array_intersect(array_keys($body['hallazgo']), $GLOBALS['camposHallazgo']);
                if ($columnas) {
                    $placeholders = implode(', ', array_fill(0, count($columnas) + 1, '?'));
                    $sql = 'INSERT INTO pdf_hallazgo_datos (id_proceso, ' . implode(', ', $columnas) . ") VALUES ({$placeholders})";
                    $valores = [$idProceso];
                    foreach ($columnas as $c) {
                        $valores[] = $body['hallazgo'][$c];
                    }
                    $pdo->prepare($sql)->execute($valores);
                }
            }

            $proceso = obtenerProcesoCompleto($pdo, $idProceso);
            responderJson(['ok' => true, 'proceso' => $proceso], 201);
        }

        if ($accion === 'actualizar' && $id) {
            $camposProceso = [];
            $valoresProceso = [];
            foreach (['nombre_archivo', 'archivo_original', 'escaneado', 'paginas', 'id_estado', 'asignado_a_id_usuario', 'confirmado', 'fecha_confirmacion'] as $c) {
                if (array_key_exists($c, $body)) {
                    $camposProceso[] = "{$c} = ?";
                    $valoresProceso[] = $body[$c];
                }
            }
            if ($camposProceso) {
                $valoresProceso[] = $id;
                $sql = 'UPDATE pdf_procesos SET ' . implode(', ', $camposProceso) . ' WHERE id_proceso = ?';
                $pdo->prepare($sql)->execute($valoresProceso);
            }

            if (!empty($body['hallazgo']) && is_array($body['hallazgo'])) {
                $columnas = array_intersect(array_keys($body['hallazgo']), $GLOBALS['camposHallazgo']);
                if ($columnas) {
                    $asignaciones = implode(', ', array_map(fn($c) => "{$c} = VALUES({$c})", $columnas));
                    $cols = implode(', ', $columnas);
                    $placeholders = implode(', ', array_fill(0, count($columnas) + 1, '?'));
                    $sql = "INSERT INTO pdf_hallazgo_datos (id_proceso, {$cols}) VALUES ({$placeholders})
                            ON DUPLICATE KEY UPDATE {$asignaciones}";
                    $valores = [$id];
                    foreach ($columnas as $c) {
                        $valores[] = $body['hallazgo'][$c];
                    }
                    $pdo->prepare($sql)->execute($valores);
                }
            }

            if (!empty($body['fase2']) && is_array($body['fase2'])) {
                $columnas = array_intersect(array_keys($body['fase2']), $GLOBALS['camposFase2']);
                if ($columnas) {
                    $asignaciones = implode(', ', array_map(fn($c) => "{$c} = VALUES({$c})", $columnas));
                    $cols = implode(', ', $columnas);
                    $placeholders = implode(', ', array_fill(0, count($columnas) + 1, '?'));
                    $sql = "INSERT INTO pdf_fase2_datos (id_proceso, {$cols}) VALUES ({$placeholders})
                            ON DUPLICATE KEY UPDATE {$asignaciones}";
                    $valores = [$id];
                    foreach ($columnas as $c) {
                        $valores[] = $body['fase2'][$c];
                    }
                    $pdo->prepare($sql)->execute($valores);
                }
            }

            if (!empty($body['imagenes_nuevas']) && is_array($body['imagenes_nuevas'])) {
                insertarImagenes($pdo, $id, $body['imagenes_nuevas']);
            } elseif (!empty($body['evidencia_ruta'])) {
                // Compatibilidad con cargas anteriores a pdf_imagenes.
                $tipoEvidencia = $body['evidencia_tipo'] ?? 'movil';
                insertarImagenes($pdo, $id, [[
                    'tipo' => $tipoEvidencia === 'movil' ? 'movil' : 'pdf',
                    'etiqueta' => $tipoEvidencia === 'movil'
                        ? 'Registro fotografico digital (paso 2)'
                        : 'Registro fotografico extraido del PDF',
                    'ruta' => $body['evidencia_ruta'],
                ]]);
            }

            $proceso = obtenerProcesoCompleto($pdo, $id);
            if (!$proceso) {
                responderJson(['ok' => false, 'error' => 'Proceso no encontrado.'], 404);
            }
            responderJson(['ok' => true, 'proceso' => $proceso]);
        }

        responderJson(['ok' => false, 'error' => 'Acción no soportada.'], 400);
    }

    if ($metodo === 'DELETE') {
        if (!$id) {
            responderJson(['ok' => false, 'error' => 'Falta el parámetro id.'], 400);
        }
        $stmt = $pdo->prepare('DELETE FROM pdf_procesos WHERE id_proceso = ?');
        $stmt->execute([$id]);
        responderJson(['ok' => true, 'eliminado' => $stmt->rowCount() > 0]);
    }

    responderJson(['ok' => false, 'error' => 'Método no permitido.'], 405);
} catch (Throwable $e) {
    responderJson(['ok' => false, 'error' => $e->getMessage()], 500);
}
