<?php

declare(strict_types=1);

require_once __DIR__ . '/../db.php';

/**
 * Lista los usuarios con acceso aprobado a AUTN TANIA (id_app = 29) y rol
 * "USUARIO" (móvil), para el buscador de asignación en la pantalla de
 * hallazgo. Reemplaza el mock obtenerUsuariosMoviles() de app.js.
 */

const ID_APP_AUTN_TANIA = 29;

header('Content-Type: application/json; charset=utf-8');

function responderJson(array $datos, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        responderJson(['ok' => false, 'error' => 'Método no permitido.'], 405);
    }

    $pdo = dbConectar();

    $stmt = $pdo->prepare(
        'SELECT u.id_usuario AS id, u.n_completo AS nombre, u.cedula, r.nombre_rol AS rol
         FROM accesos a
         INNER JOIN usuarios u ON u.id_usuario = a.id_usuario
         INNER JOIN roles r ON r.id_rol = a.id_rol
         WHERE a.id_app = ? AND a.estado_aprobacion = "aprobado"
           AND LOWER(r.nombre_rol) NOT LIKE "%admin%"
         ORDER BY u.n_completo'
    );
    $stmt->execute([ID_APP_AUTN_TANIA]);

    responderJson(['ok' => true, 'usuarios' => $stmt->fetchAll()]);
} catch (Throwable $e) {
    responderJson(['ok' => false, 'error' => $e->getMessage()], 500);
}
