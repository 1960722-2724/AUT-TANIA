<?php

declare(strict_types=1);

/**
 * Conexión PDO a la base de datos u510981418_horasextra (compartida entre
 * varias aplicaciones). Lee credenciales del archivo .env en la raíz del
 * proyecto (no versionado).
 */

/**
 * Carga las variables de un archivo .env en el entorno del proceso actual,
 * sin sobrescribir variables ya definidas.
 */
function cargarEnv(string $rutaEnv): void
{
    if (!is_file($rutaEnv)) {
        return;
    }

    foreach (file($rutaEnv, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linea) {
        $linea = trim($linea);
        if ($linea === '' || str_starts_with($linea, '#') || !str_contains($linea, '=')) {
            continue;
        }

        [$clave, $valor] = explode('=', $linea, 2);
        $clave = trim($clave);
        $valor = trim($valor);

        if (getenv($clave) === false) {
            putenv("{$clave}={$valor}");
        }
    }
}

cargarEnv(__DIR__ . '/../../.env');

/**
 * Devuelve una conexión PDO a la base de datos, reutilizando la misma
 * instancia dentro de la misma petición.
 */
function dbConectar(): PDO
{
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $host = getenv('DB_HOST') ?: 'localhost';
    $port = getenv('DB_PORT') ?: '3306';
    $nombre = getenv('DB_NAME') ?: 'u510981418_horasextra';
    $usuario = getenv('DB_USER') ?: 'root';
    $password = getenv('DB_PASS') ?: '';

    $dsn = "mysql:host={$host};port={$port};dbname={$nombre};charset=utf8mb4";

    $pdo = new PDO($dsn, $usuario, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}
