<?php

declare(strict_types=1);

/**
 * Configuración de AUTN TANIA - API
 *
 * Centraliza rutas y binarios de Poppler para la manipulación de PDF.
 */

define('API_TMP_DIR', __DIR__ . '/tmp');

/**
 * Localiza los binarios de Poppler (pdftotext, pdfimages, pdfinfo).
 *
 * Busca en orden:
 *  1. Variable de entorno POPPLER_BIN (override explícito).
 *  2. Instalación winget de Windows (desarrollo local).
 *  3. Rutas del sistema (Linux/macOS: poppler-utils).
 *
 * Devuelve el directorio que contiene los binarios, o null si no se encuentra.
 */
function popplerBinDir(): ?string
{
    $candidatos = [];

    // Override explícito.
    if (getenv('POPPLER_BIN')) {
        $candidatos[] = getenv('POPPLER_BIN');
    }

    // Instalación winget de Windows.
    $localAppData = getenv('LOCALAPPDATA');
    if ($localAppData) {
        $candidatos[] = $localAppData . '/Microsoft/WinGet/Packages/oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe/poppler-25.07.0/Library/bin';
    }

    foreach ($candidatos as $dir) {
        if (is_dir($dir) && is_file($dir . '/pdftotext' . (PHP_OS_FAMILY === 'Windows' ? '.exe' : ''))) {
            return $dir;
        }
    }

    // Linux/macOS con poppler-utils en el PATH.
    $bin = PHP_OS_FAMILY === 'Windows' ? 'pdftotext.exe' : 'pdftotext';
    $cmd = PHP_OS_FAMILY === 'Windows' ? 'where' : 'which';
    $output = [];
    exec($cmd . ' ' . escapeshellarg($bin) . ' 2>NUL', $output);
    if (!empty($output)) {
        return dirname($output[0]);
    }

    return null;
}

/**
 * Devuelve la ruta completa a un binario de poppler, o lanza excepción.
 */
function popplerBin(string $name): string
{
    static $dir = null;
    if ($dir === null) {
        $dir = popplerBinDir();
        if ($dir === null) {
            throw new RuntimeException(
                'No se encontraron los binarios de Poppler. Instala poppler-utils y, si es necesario, define la variable POPPLER_BIN.'
            );
        }
    }

    $exe = $name . (PHP_OS_FAMILY === 'Windows' ? '.exe' : '');
    $path = $dir . '/' . $exe;

    if (!is_file($path)) {
        throw new RuntimeException("Binario de Poppler no encontrado: {$name}");
    }

    return $path;
}

if (!is_dir(API_TMP_DIR)) {
    mkdir(API_TMP_DIR, 0777, true);
}

/**
 * Localiza el binario de Tesseract OCR.
 *
 * Busca en orden:
 *  1. Variable de entorno TESSERACT_BIN (override explícito).
 *  2. Instalación estándar de Windows (UB-Mannheim).
 *  3. PATH del sistema.
 *
 * Devuelve la ruta completa al ejecutable, o null si no se encuentra.
 */
function tesseractBin(): ?string
{
    $candidatos = [];

    if (getenv('TESSERACT_BIN')) {
        $candidatos[] = getenv('TESSERACT_BIN');
    }

    $programFiles = getenv('ProgramFiles');
    if ($programFiles) {
        $candidatos[] = $programFiles . '/Tesseract-OCR/tesseract.exe';
    }

    foreach ($candidatos as $path) {
        if (is_file($path)) {
            return $path;
        }
    }

    $bin = PHP_OS_FAMILY === 'Windows' ? 'tesseract.exe' : 'tesseract';
    $cmd = PHP_OS_FAMILY === 'Windows' ? 'where' : 'which';
    $output = [];
    exec($cmd . ' ' . escapeshellarg($bin) . ' 2>NUL', $output);
    if (!empty($output)) {
        return $output[0];
    }

    return null;
}
