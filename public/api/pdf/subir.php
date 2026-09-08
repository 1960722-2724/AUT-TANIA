<?php

declare(strict_types=1);

set_time_limit(0);

require_once __DIR__ . '/PdfProcessor.php';

/**
 * Endpoint HTTP: recibe un PDF, lo procesa y devuelve los resultados en JSON.
 *
 * POST multipart/form-data con el campo "archivo".
 */

header('Content-Type: application/json; charset=utf-8');

function responderJson(array $datos, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        responderJson(['ok' => false, 'error' => 'Método no permitido.'], 405);
    }

    if (!isset($_FILES['archivo']) || $_FILES['archivo']['error'] !== UPLOAD_ERR_OK) {
        responderJson(['ok' => false, 'error' => 'No se recibió archivo o la subida falló.'], 400);
    }

    $file = $_FILES['archivo'];
    $nombreOriginal = $file['name'];

    if (!preg_match('/\.pdf$/i', $nombreOriginal)) {
        responderJson(['ok' => false, 'error' => 'Solo se permiten archivos PDF.'], 400);
    }

    $tmpName = $file['tmp_name'];
    $destino = API_TMP_DIR . '/' . uniqid('subida_', true) . '.pdf';

    if (!move_uploaded_file($tmpName, $destino)) {
        responderJson(['ok' => false, 'error' => 'No se pudo guardar el archivo.'], 500);
    }

    // El frontend envía un token opcional para escribir el progreso real en
    // public/api/tmp/progreso_<token>.json (archivo estático que el frontend
    // puede leer sin crear un endpoint adicional).
    $token = $_POST['progreso'] ?? '';
    $progFile = null;
    if ($token !== '' && preg_match('/^[A-Za-z0-9_\-]+$/', $token)) {
        $progFile = API_TMP_DIR . '/progreso_' . $token . '.json';
    }

    $reportar = function (int $pct, string $texto) use ($progFile): void {
        if ($progFile === null) {
            return;
        }
        $contenido = json_encode(
            ['pct' => $pct, 'texto' => $texto],
            JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
        );
        @file_put_contents($progFile, $contenido);
    };

    $proc = new PdfProcessor($destino);
    $proc->setReportadorProgreso($reportar);
    $resultado = $proc->procesar();
    $resultado['archivo_original'] = $nombreOriginal;

    if ($progFile !== null) {
        @unlink($progFile);
    }

    responderJson($resultado);
} catch (Throwable $e) {
    if (isset($progFile) && $progFile !== null) {
        @unlink($progFile);
    }
    responderJson(['ok' => false, 'error' => $e->getMessage()], 500);
}
