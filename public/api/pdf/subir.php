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

    $proc = new PdfProcessor($destino);
    $resultado = $proc->procesar();
    $resultado['archivo_original'] = $nombreOriginal;

    responderJson($resultado);
} catch (Throwable $e) {
    responderJson(['ok' => false, 'error' => $e->getMessage()], 500);
}
