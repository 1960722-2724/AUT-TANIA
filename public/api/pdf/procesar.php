<?php

declare(strict_types=1);

require_once __DIR__ . '/PdfProcessor.php';

/**
 * Punto de entrada de prueba del procesador de PDF.
 *
 * Uso:
 *   php procesar.php <ruta-a-pdf.pdf>
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Solo disponible por línea de comandos.');
}

$pdf = $argv[1] ?? null;
if (!$pdf) {
    fwrite(STDERR, "Uso: php procesar.php <ruta-a-pdf.pdf>\n");
    exit(1);
}

try {
    $proc = new PdfProcessor($pdf);
    $resultado = $proc->procesar();
    echo json_encode($resultado, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}
