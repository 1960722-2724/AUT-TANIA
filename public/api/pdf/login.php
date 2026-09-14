<?php

declare(strict_types=1);

require_once __DIR__ . '/../db.php';

/**
 * Autentica contra la BD compartida: valida cedula+contrasena en `usuario`
 * y exige acceso aprobado a esta app (id_app = 29) en `accesos`. El rol que
 * ve la app (USUARIO/ADMIN) se deriva del nombre_rol asignado en `accesos`,
 * no de lo que el usuario elija en el formulario.
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
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        responderJson(['ok' => false, 'error' => 'Método no permitido.'], 405);
    }

    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $cedula = trim((string) ($body['cedula'] ?? ''));
    $password = (string) ($body['password'] ?? '');

    if ($cedula === '' || $password === '') {
        responderJson(['ok' => false, 'error' => 'Cédula y contraseña son obligatorias.'], 400);
    }

    $pdo = dbConectar();

    $stmt = $pdo->prepare(
        'SELECT u.contrasena, us.id_usuario, us.n_completo AS nombre, r.nombre_rol
         FROM usuario u
         INNER JOIN usuarios us ON us.cedula = u.cedula
         INNER JOIN accesos a ON a.id_usuario = us.id_usuario
            AND a.id_app = ? AND a.estado_aprobacion = "aprobado"
         INNER JOIN roles r ON r.id_rol = a.id_rol
         WHERE u.cedula = ?'
    );
    $stmt->execute([ID_APP_AUTN_TANIA, $cedula]);
    $fila = $stmt->fetch();

    if (!$fila || !$fila['contrasena'] || !password_verify($password, $fila['contrasena'])) {
        responderJson(['ok' => false, 'error' => 'Cédula o contraseña incorrectas, o no tienes acceso a esta aplicación.'], 401);
    }

    $rol = stripos($fila['nombre_rol'], 'admin') !== false ? 'ADMIN' : 'USUARIO';

    responderJson([
        'ok' => true,
        'usuario' => [
            'id' => (int) $fila['id_usuario'],
            'nombre' => $fila['nombre'],
            'cedula' => $cedula,
            'rol' => $rol,
        ],
    ]);
} catch (Throwable $e) {
    responderJson(['ok' => false, 'error' => $e->getMessage()], 500);
}
