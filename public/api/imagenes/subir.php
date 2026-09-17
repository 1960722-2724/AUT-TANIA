<?php

declare(strict_types=1);

/**
 * Endpoint receptor de evidencias (se despliega en el hosting Hostinger).
 *
 * Recibe una imagen —como multipart (campo "image") o como dataURL base64
 * (campo "image_base64")—, la optimiza a WebP y la guarda en
 * public/uploads/imagenes. Devuelve la URL root-relative para que el cliente
 * (máquina de campo) construya la URL absoluta.
 *
 * Adaptado de "Tabasco - Quizz Formacion" (api/upload.php): misma lógica de
 * validación, redimensionado y compresión WebP con GD.
 *
 * Seguridad: si la variable IMAGENES_SYNC_TOKEN está definida en el .env,
 * se exige un token (cabecera X-Sync-Token o campo POST "token") igual.
 */

require_once __DIR__ . '/../db.php';

cargarEnv(__DIR__ . '/../../.env');

const IMAGENES_DIR = __DIR__ . '/../../uploads/imagenes';
const IMAGENES_MAX_ANCHO = 1280;
const IMAGENES_MAX_BYTES = 5 * 1024 * 1024;
const IMAGENES_WEBP_Q = 82;

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

    // Token opcional: solo se exige si está configurado en el hosting.
    $tokenEsperado = getenv('IMAGENES_SYNC_TOKEN') ?: '';
    if ($tokenEsperado !== '') {
        $tokenRecibido = $_SERVER['HTTP_X_SYNC_TOKEN'] ?? ($_POST['token'] ?? '');
        if (!is_string($tokenRecibido) || $tokenRecibido !== $tokenEsperado) {
            responderJson(['ok' => false, 'error' => 'Token de sincronización inválido.'], 401);
        }
    }

    if (!function_exists('imagewebp')) {
        responderJson(['ok' => false, 'error' => 'El servidor no tiene soporte WebP. Activa la extensión GD.'], 500);
    }

    $mime = null;
    $binario = null;

    //  1) multipart/form-data con el campo "image"
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['image'];
        $mime = $file['type'];
        $binario = file_get_contents($file['tmp_name']);
    }

    //  2) dataURL base64 en el campo "image_base64" (evidencia móvil)
    if ($binario === null && isset($_POST['image_base64']) && is_string($_POST['image_base64'])) {
        $data = $_POST['image_base64'];
        if (preg_match('#^data:image/(jpeg|png|gif|webp);base64,(.*)$#is', $data, $m)) {
            $mime = 'image/' . $m[1];
            $binario = base64_decode($m[2], true);
        }
    }

    if ($binario === null) {
        responderJson(['ok' => false, 'error' => 'No se recibió imagen (campo "image" o "image_base64").'], 400);
    }

    $permitidos = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($mime, $permitidos)) {
        responderJson(['ok' => false, 'error' => 'Tipo de archivo no permitido. Solo JPG, PNG, GIF, WebP.'], 400);
    }

    if (strlen($binario) > IMAGENES_MAX_BYTES) {
        responderJson(['ok' => false, 'error' => 'La imagen no debe superar los 5MB.'], 400);
    }

    $src = @imagecreatefromstring($binario);
    if (!$src) {
        responderJson(['ok' => false, 'error' => 'No se pudo leer la imagen.'], 500);
    }

    imagepalettetotruecolor($src);
    imagealphablending($src, false);
    imagesavealpha($src, true);

    $origW = imagesx($src);
    $origH = imagesy($src);

    if ($origW > IMAGENES_MAX_ANCHO) {
        $newH    = (int) round($origH * IMAGENES_MAX_ANCHO / $origW);
        $resized = imagecreatetruecolor(IMAGENES_MAX_ANCHO, $newH);
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $src, 0, 0, 0, 0, IMAGENES_MAX_ANCHO, $newH, $origW, $origH);
        $src = $resized;
    }

    if (!is_dir(IMAGENES_DIR)) {
        mkdir(IMAGENES_DIR, 0755, true);
    }

    $filename = uniqid('img_') . '.webp';
    $dest     = IMAGENES_DIR . '/' . $filename;

    if (!imagewebp($src, $dest, IMAGENES_WEBP_Q)) {
        responderJson(['ok' => false, 'error' => 'Error al guardar la imagen como WebP.'], 500);
    }

    responderJson(['ok' => true, 'url' => '/uploads/imagenes/' . $filename]);
} catch (Throwable $e) {
    responderJson(['ok' => false, 'error' => $e->getMessage()], 500);
}