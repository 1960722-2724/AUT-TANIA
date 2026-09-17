<?php

declare(strict_types=1);

/**
 * Endpoint cliente de imágenes (corre en la máquina de campo).
 *
 * Recibe por JSON:
 *   { "url": "/api/tmp/evidencia.png" }  -> usa el archivo local extraído del PDF
 *   { "base64": "data:image/jpeg;base64,..." } -> usa la evidencia móvil capturada
 *
 * El destino depende de la configuración IMAGENES_SYNC_URL del .env:
 *
 *   - Vacío (modo local): la imagen se guarda de forma permanente en
 *     public/uploads/imagenes/ y se devuelve una URL local del servidor
 *     (accesible desde cualquier dispositivo en la misma red).
 *
 *   - Con URL (hosting): la imagen se reenvía por HTTP POST (multipart) al
 *     endpoint receptor desplegado en Hostinger (public/api/imagenes/subir.php)
 *     y se devuelve la URL absoluta servida por el hosting.
 *
 * En ambos casos devuelve { ok, url }.
 */

require_once __DIR__ . '/../db.php';

cargarEnv(__DIR__ . '/../../.env');

const IMAGENES_TMP_DIR = __DIR__ . '/../tmp';
const IMAGENES_DIR_LOCAL = __DIR__ . '/../../uploads/imagenes';
const IMAGENES_MAX_ANCHO_LOCAL = 1280;
const IMAGENES_MAX_BYTES_LOCAL = 5 * 1024 * 1024;
const IMAGENES_WEBP_Q_LOCAL = 82;

function responderJson(array $datos, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/**
 * Prefijo base de la aplicación en la URL (p. ej. "/AUTN TANIA/public").
 * Permite devolver URLs accesibles desde el navegador aunque la app no esté
 * montada en la raíz del servidor. Devuelve '' cuando sí está en la raíz.
 */
function baseAppUrl(): string
{
    $script = $_SERVER['SCRIPT_NAME'] ?? '';
    $base   = preg_replace('#/api/imagenes/sincronizar\.php$#', '', $script);
    if ($base === '' || $base === null) {
        return '';
    }
    $segmentos = array_map('rawurlencode', explode('/', $base));
    return implode('/', $segmentos);
}

/**
 * Guarda la imagen en public/uploads/imagenes/ (carpeta permanente) y devuelve
 * la URL root-relative incluyendo el prefijo de la aplicación. Si GD con WebP
 * está disponible, optimiza la imagen; de lo contrario copia el original.
 */
function almacenarImagenLocal(string $binario, string $mime): string
{
    if (strlen($binario) > IMAGENES_MAX_BYTES_LOCAL) {
        responderJson(['ok' => false, 'error' => 'La imagen no debe superar los 5MB.'], 400);
    }

    $permitidos = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($mime, $permitidos, true)) {
        responderJson(['ok' => false, 'error' => 'Tipo de archivo no permitido. Solo JPG, PNG, GIF, WebP.'], 400);
    }

    if (!is_dir(IMAGENES_DIR_LOCAL)) {
        mkdir(IMAGENES_DIR_LOCAL, 0777, true);
    }

    $filename = uniqid('img_') . '.webp';
    $dest = IMAGENES_DIR_LOCAL . '/' . $filename;

    if (function_exists('imagewebp')) {
        $src = @imagecreatefromstring($binario);
        if ($src !== false) {
            imagepalettetotruecolor($src);
            imagealphablending($src, false);
            imagesavealpha($src, true);

            $origW = imagesx($src);
            $origH = imagesy($src);

            if ($origW > IMAGENES_MAX_ANCHO_LOCAL) {
                $newH = (int) round($origH * IMAGENES_MAX_ANCHO_LOCAL / $origW);
                $resized = imagecreatetruecolor(IMAGENES_MAX_ANCHO_LOCAL, $newH);
                imagealphablending($resized, false);
                imagesavealpha($resized, true);
                imagecopyresampled($resized, $src, 0, 0, 0, 0, IMAGENES_MAX_ANCHO_LOCAL, $newH, $origW, $origH);
                $src = $resized;
            }

            if (imagewebp($src, $dest, IMAGENES_WEBP_Q_LOCAL)) {
                imagedestroy($src);
                return baseAppUrl() . '/uploads/imagenes/' . $filename;
            }
            imagedestroy($src);
        }
    }

    // Fallback: copiar el archivo original con su extensión.
    $ext = match ($mime) {
        'image/jpeg' => 'jpg',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        default => 'png',
    };
    $filename = uniqid('img_') . '.' . $ext;
    $dest = IMAGENES_DIR_LOCAL . '/' . $filename;

    if (@file_put_contents($dest, $binario) === false) {
        responderJson(['ok' => false, 'error' => 'No se pudo guardar la imagen en el servidor local.'], 500);
    }
    return baseAppUrl() . '/uploads/imagenes/' . $filename;
}

function baseHosting(string $urlSync): string
{
    $parsed = parse_url($urlSync);
    $scheme = $parsed['scheme'] ?? 'https';
    $host   = $parsed['host'] ?? '';
    if ($host === '') {
        return '';
    }
    $base = $scheme . '://' . $host;
    if (isset($parsed['port'])) {
        $base .= ':' . $parsed['port'];
    }
    return $base;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        responderJson(['ok' => false, 'error' => 'Método no permitido.'], 405);
    }

    $body = json_decode(file_get_contents('php://input'), true) ?: [];

    $urlSync = getenv('IMAGENES_SYNC_URL') ?: '';
    $token   = getenv('IMAGENES_SYNC_TOKEN') ?: '';

    // --- Leer el origen de la imagen (archivo local extraído del PDF o dataURL) ---
    $binario = null;
    $mime = null;
    $nombreOriginal = null;

    if (isset($body['url']) && is_string($body['url']) && $body['url'] !== '') {
        // La URL es tipo /api/tmp/<carpeta>/img-P-N.png: resolver la ruta local a
        // partir del prefijo /api/tmp/ (la imagen vive dentro de una subcarpeta).
        $marker = strpos($body['url'], '/api/tmp/');
        $rel    = $marker !== false ? substr($body['url'], $marker + strlen('/api/tmp/')) : basename($body['url']);
        $rutaLocal = IMAGENES_TMP_DIR . '/' . ltrim($rel, '/\\');

        // Evitar salir del directorio temporal (path traversal).
        $realBase = realpath(IMAGENES_TMP_DIR);
        $realRuta = realpath($rutaLocal);
        if ($realBase === false || $realRuta === false || !str_starts_with($realRuta, $realBase)) {
            responderJson(['ok' => false, 'error' => 'Ruta de imagen inválida: ' . $body['url']], 400);
        }

        $info = @getimagesize($realRuta);
        $mime = $info['mime'] ?? 'image/png';
        $binario = @file_get_contents($realRuta);
        $nombreOriginal = basename($realRuta);
    } elseif (isset($body['base64']) && is_string($body['base64']) && $body['base64'] !== '') {
        $data = $body['base64'];
        if (preg_match('#^data:image/(jpeg|png|gif|webp);base64,(.*)$#is', $data, $m)) {
            $mime = 'image/' . $m[1];
            $binario = base64_decode($m[2], true);
            $ext = match ($m[1]) {
                'jpeg'  => 'jpg',
                'webp'  => 'webp',
                'gif'   => 'gif',
                default => 'png',
            };
            $nombreOriginal = bin2hex(random_bytes(6)) . '.' . $ext;
        }
        if ($binario === null) {
            responderJson(['ok' => false, 'error' => 'dataURL de imagen no válida.'], 400);
        }
    } else {
        responderJson(['ok' => false, 'error' => 'Falta el campo "url" o "base64".'], 400);
    }

    if ($binario === null || $binario === '') {
        responderJson(['ok' => false, 'error' => 'No se pudo leer la imagen.'], 400);
    }

    // --- Sin sincronización configurada: guardar localmente (modo local) ---
    if ($urlSync === '') {
        responderJson(['ok' => true, 'url' => almacenarImagenLocal($binario, $mime)]);
    }

    // --- Sincronización configurada: reenviar la imagen al hosting ---
    $ext = match ($mime) {
        'image/jpeg' => 'jpg',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        default => 'png',
    };
    $tmpCreado = tempnam(sys_get_temp_dir(), 'autn_sync_') . '.' . $ext;
    if (!@file_put_contents($tmpCreado, $binario)) {
        responderJson(['ok' => false, 'error' => 'No se pudo preparar el archivo para sincronizar.'], 500);
    }

    $archivo = new CURLFile($tmpCreado, $mime, $nombreOriginal ?: (bin2hex(random_bytes(6)) . '.' . $ext));

    $campos = ['image' => $archivo];
    if ($token !== '') {
        $campos['token'] = $token;
    }

    $ch = curl_init($urlSync);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $campos);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 120);
    if ($token !== '') {
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['X-Sync-Token: ' . $token]);
    }

    $resp = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    @unlink($tmpCreado);

    if ($resp === false) {
        responderJson(['ok' => false, 'error' => 'No se pudo conectar con el servidor de Hostinger: ' . $err], 502);
    }

    $json = json_decode($resp, true);
    if ($code >= 200 && $code < 300 && is_array($json) && !empty($json['ok']) && !empty($json['url'])) {
        $urlRemota = $json['url'];
        if (strpos($urlRemota, 'http') !== 0) {
            $urlRemota = baseHosting($urlSync) . $urlRemota;
        }
        responderJson(['ok' => true, 'url' => $urlRemota]);
    }

    responderJson([
        'ok'    => false,
        'error' => is_array($json) && !empty($json['error'])
            ? 'Hostinger rechazó la subida: ' . $json['error']
            : 'Hostinger no aceptó la subida (HTTP ' . $code . ').',
    ], 502);
} catch (Throwable $e) {
    responderJson(['ok' => false, 'error' => $e->getMessage()], 500);
}