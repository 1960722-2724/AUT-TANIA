<?php

declare(strict_types=1);

require_once __DIR__ . '/../config.php';

/**
 * Procesador de PDFs de AUTN TANIA.
 *
 * Implementa el flujo completo de extracción usando binarios de Poppler (+ Tesseract
 * cuando el documento es escaneado, es decir, sin capa de texto):
 *
 *   1. pdftotext        → texto plano (por página).
 *   2. pdftotext -bbox  → texto con coordenadas por palabra (cuando hay capa de texto).
 *   3. pdfimages -list  → inventario de imágenes incrustadas por página (orden de extracción).
 *   4. pdfimages -png   → extrae las imágenes a archivo.
 *   5. pdftoppm + tesseract → OCR por página para documentos escaneados.
 *
 * La localización de la sección "REGISTRO FOTOGRÁFICO" se hace por texto (extraído
 * con pdftotext o con OCR) determinando la página donde aparece, y la primera imagen
 * correspondiente se identifica por página y orden de extracción, asumiendo una
 * estructura de documento consistente (según las reglas del proyecto).
 */
class PdfProcessor
{
    /**
     * Orden de aparición de los campos en el formulario fijo de hallazgos.
     */
    private const CAMPOS_ORDEN = [
        'fechaHora',
        'quienReporta',
        'aliado',
        'regional',
        'departamento',
        'listaMunicipios',
        'municipio',
        'barrio',
        'direccion',
        'puntoReferencia',
        'coordenadas',
        'duenoInfraestructura',
        'codigoPacvi',
        'vulnerabilidadesInfraestructura',
        'estadoInfraestructura',
        'vulnerabilidad',
        'asociarOT',
        'prioridad',
        'observaciones',
    ];

    /**
     * Etiquetas del formulario tal como aparecen en el documento (con acentos).
     * Puede haber varias variantes por campo para tolerar diferencias de OCR.
     */
    private const CAMPOS_ETIQUETAS = [
        'fechaHora'             => ['FECHA Y HORA'],
        'quienReporta'          => ['NOMBRE QUIEN REPORTA', 'NOMBRE QUIÉN REPORTA'],
        'aliado'                => ['ALIADO'],
        'regional'              => ['REGIONAL'],
        'departamento'          => ['DEPARTAMENTO'],
        'listaMunicipios'       => ['LISTA DE MUNCIPIOS', 'LISTA DE MUNICIPIOS'],
        'municipio'             => ['MUNICIPIO'],
        'barrio'                => ['BARRIO'],
        'direccion'             => ['DIRECCIÓN'],
        'puntoReferencia'       => ['PUNTO DE REFERENCIA'],
        'coordenadas'           => ['COORDENADAS'],
        'duenoInfraestructura'  => ['DUEÑO INFRAESTRUCTURA', 'DUEÑO DE INFRAESTRUCTURA'],
        'codigoPacvi'           => ['CODIGO PACVI', 'CÓDIGO PACVI'],
        'vulnerabilidadesInfraestructura' => ['VULNERABILIDADES DE INFRAESTRUCTURA', 'VULNERABILIDADES INFRAESTRUCTURA'],
        'estadoInfraestructura' => ['ESTADO DE INFRAESTRUCTURA', 'ESTADO DE LA INFRAESTRUCTURA'],
        'vulnerabilidad'        => ['VULNERABILIDADES RED PROPIA', 'VULNERABILIDAD RED PROPIA'],
        'asociarOT'             => ['ASOCIAR OT'],
        'prioridad'             => ['PRIORIDAD'],
        'observaciones'         => ['OBSERVACIONES'],
    ];

    private string $pdfPath;
    private string $outDir;
    private string $baseName;

    /**
     * Indica si el documento es escaneado (no se obtuvo texto con pdftotext).
     * Se calcula bajo demanda y se cachea.
     */
    private ?bool $escaneadoCache = null;

    public function __construct(string $pdfPath, ?string $outDir = null)
    {
        if (!is_file($pdfPath)) {
            throw new InvalidArgumentException("El archivo PDF no existe: {$pdfPath}");
        }
        $this->pdfPath = $pdfPath;
        $this->baseName = pathinfo($pdfPath, PATHINFO_FILENAME);
        $this->outDir = $outDir ?? (API_TMP_DIR . '/' . $this->baseName);
        if (!is_dir($this->outDir)) {
            mkdir($this->outDir, 0777, true);
        }
    }

    /**
     * Número de páginas del documento (pdfinfo).
     */
    public function numeroPaginas(): int
    {
        [$out, $code] = $this->run('pdfinfo', [$this->pdfPath]);
        if ($code !== 0 || preg_match('/Pages:\s+(\d+)/i', $out, $m) !== 1) {
            throw new RuntimeException('No se pudo obtener el número de páginas.');
        }
        return (int) $m[1];
    }

    /**
     * Ejecuta un binario de poppler y captura su stdout.
     *
     * @return array{0:string,1:int} [stdout, codigoSalida]
     */
    private function run(string $bin, array $args): array
    {
        $exe = popplerBin($bin);
        $cmd = escapeshellarg($exe);
        foreach ($args as $arg) {
            $cmd .= ' ' . escapeshellarg($arg);
        }

        $descriptors = [
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $proc = proc_open($cmd, $descriptors, $pipes);
        if (!is_resource($proc)) {
            throw new RuntimeException("No se pudo ejecutar: {$cmd}");
        }

        $stdout = stream_get_contents($pipes[1]);
        stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $code = proc_close($proc);

        return [$stdout, $code];
    }

    /**
     * Determina si el documento es escaneado (no tiene capa de texto útil).
     */
    public function esEscaneado(): bool
    {
        if ($this->escaneadoCache !== null) {
            return $this->escaneadoCache;
        }

        $textoBruto = '';
        try {
            [$out] = $this->run('pdftotext', [$this->pdfPath, '-']);
            $textoBruto = trim($out);
        } catch (Throwable $e) {
            $textoBruto = '';
        }

        $this->escaneadoCache = (strlen($textoBruto) < 20);
        return $this->escaneadoCache;
    }

    /**
     * Extrae el texto plano (por página).
     *
     * Si el documento es escaneado, las páginas se renderizan y se aplica OCR (Tesseract).
     *
     * @return string[]  Texto de cada página (índice 0 = página 1).
     */
    public function extraerTextoPlano(): array
    {
        $total = $this->numeroPaginas();

        if ($this->esEscaneado()) {
            return $this->ocrPorPaginas($total);
        }

        [$out] = $this->run('pdftotext', [$this->pdfPath, '-']);
        $out = $this->normalizarTexto($out);
        $paginas = preg_split('/\f/', $out);
        $paginas = array_values(array_filter($paginas, function ($p) {
            return trim($p) !== '' || true;
        }));

        // Normalizar a $total páginas.
        $resultado = [];
        for ($i = 0; $i < $total; $i++) {
            $resultado[] = isset($paginas[$i]) ? trim($paginas[$i]) : '';
        }
        return $resultado;
    }

    /**
     * Aplica OCR (Tesseract) a cada página del documento.
     *
     * @return string[]  Texto de cada página.
     */
    private function ocrPorPaginas(int $total): array
    {
        $tess = tesseractBin();
        if ($tess === null) {
            throw new RuntimeException('El documento es escaneado y Tesseract OCR no está disponible.');
        }

        $ppmopp = popplerBin('pdftoppm');
        $resolucion = 200;

        $textos = [];
        for ($pagina = 1; $pagina <= $total; $pagina++) {
            $prefijo = $this->outDir . '/ocr_p' . $pagina;
            $imagenReferencia = $prefijo . '-*.png';

            // Renderizar la página a PNG.
            $cmd = escapeshellarg($ppmopp)
                . ' -png -r ' . $resolucion
                . ' -f ' . $pagina . ' -l ' . $pagina
                . ' ' . escapeshellarg($this->pdfPath)
                . ' ' . escapeshellarg($prefijo);

            $descriptors = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
            $proc = proc_open($cmd, $descriptors, $pipes);
            if (is_resource($proc)) {
                stream_get_contents($pipes[1]);
                stream_get_contents($pipes[2]);
                fclose($pipes[1]);
                fclose($pipes[2]);
                proc_close($proc);
            }

            $archivos = glob($imagenReferencia) ?: [];
            if (empty($archivos)) {
                $textos[] = '';
                continue;
            }
            $png = $archivos[0];

            // OCR sobre la imagen renderizada.
            $cmdOcr = escapeshellarg($tess)
                . ' ' . escapeshellarg($png)
                . ' stdout -l spa --psm 3';

            $descriptors2 = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
            $proc2 = proc_open($cmdOcr, $descriptors2, $pipes2);
            if (!is_resource($proc2)) {
                $textos[] = '';
                continue;
            }
            $ocr = stream_get_contents($pipes2[1]);
            stream_get_contents($pipes2[2]);
            fclose($pipes2[1]);
            fclose($pipes2[2]);
            proc_close($proc2);

            $ocr = $this->normalizarTexto($ocr);
            $textos[] = trim(preg_replace('/[ \t]+/', ' ', $ocr));
        }

        return $textos;
    }

    /**
     * Extrae el texto con coordenadas por palabra (solo para documentos con capa de texto).
     *
     * @return array<int,array<string,mixed>>
     */
    public function extraerTextoConCoordenadas(): array
    {
        [$xml, $code] = $this->run('pdftotext', ['-bbox', $this->pdfPath, '-']);
        if ($code !== 0) {
            throw new RuntimeException('Fallo pdftotext (bbox).');
        }

        if (!preg_match_all('/<page width="([\d.]+)" height="([\d.]+)">(.*?)<\/page>/s', $xml, $pags, PREG_SET_ORDER)) {
            return [];
        }

        $paginas = [];
        foreach ($pags as $i => $pag) {
            $words = [];
            if (preg_match_all(
                '/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]+)<\/word>/',
                $pag[3],
                $ws,
                PREG_SET_ORDER
            )) {
                foreach ($ws as $w) {
                    $words[] = [
                        'text' => html_entity_decode($w[5], ENT_QUOTES | ENT_HTML5),
                        'x'    => (float) $w[1],
                        'y'    => (float) $w[2],
                        'xmax' => (float) $w[3],
                        'ymax' => (float) $w[4],
                    ];
                }
            }
            $paginas[] = [
                'page'   => $i + 1,
                'width'  => (float) $pag[1],
                'height' => (float) $pag[2],
                'words'  => $words,
            ];
        }

        return $paginas;
    }

    /**
     * Inventario de imágenes incrustadas por página.
     *
     * @return array<int,array<string,mixed>>
     */
    public function listarImagenes(): array
    {
        [$out, $code] = $this->run('pdfimages', ['-list', $this->pdfPath]);
        if ($code !== 0) {
            throw new RuntimeException('Fallo pdfimages -list.');
        }

        $lineas = preg_split('/\r?\n/', trim($out));
        $imagenes = [];

        foreach ($lineas as $linea) {
            if (str_starts_with($linea, 'page') || str_starts_with($linea, '-----')) {
                continue;
            }
            $campos = preg_split('/\s+/', trim($linea));
            if (count($campos) < 11) {
                continue;
            }
            $imagenes[] = [
                'page'   => (int) $campos[0],
                'num'    => (int) $campos[1],
                'type'   => $campos[2],
                'width'  => (int) $campos[3],
                'height' => (int) $campos[4],
                'color'  => $campos[5],
                'comp'   => (int) $campos[6],
                'bpc'    => (int) $campos[7],
                'enc'    => $campos[8],
                'ppix'   => (float) $campos[12],
                'ppiy'   => (float) $campos[13],
            ];
        }

        return $imagenes;
    }

    /**
     * Busca la página donde aparece la sección "REGISTRO FOTOGRÁFICO".
     *
     * @return array|null ['page'=>int] | ['page'=>int,'x'=>float,'y'=>float,'yMin'=>float,'yMax'=>float] si hay coordenadas.
     */
    public function localizarSeccionRegistro(): ?array
    {
        // Preferir coordenadas cuando hay capa de texto.
        if (!$this->esEscaneado()) {
            $porCoordenadas = $this->localizarRegistroPorCoordenadas();
            if ($porCoordenadas !== null) {
                return $porCoordenadas;
            }
        }

        // Fallback / escaneado: buscar por texto plano (página).
        $texto = $this->extraerTextoPlano();
        foreach ($texto as $i => $pagina) {
            $superior = $this->normalizar(preg_replace('/[^A-Za-zÁÉÍÓÚÑáéíóúñ\s]/u', ' ', mb_strtoupper($pagina)));
            if (str_contains($superior, 'REGISTRO') && str_contains($superior, 'FOTOGRA')) {
                return ['page' => $i + 1];
            }
        }

        return null;
    }

    /**
     * Elimina tildes/diacríticos para búsquedas insensibles a acentos y mayúsculas.
     */
    private function normalizar(string $texto): string
    {
        $mapa = [
            'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U',
            'Ü' => 'U', 'Ñ' => 'N',
            'À' => 'A', 'È' => 'E', 'Ì' => 'I', 'Ò' => 'O', 'Ù' => 'U',
        ];
        return strtr($texto, $mapa);
    }

    /**
     * Localiza la sección con coordenadas si el documento tiene capa de texto.
     */
    private function localizarRegistroPorCoordenadas(): ?array
    {
        foreach ($this->extraerTextoConCoordenadas() as $pagina) {
            $lineas = [];
            foreach ($pagina['words'] as $w) {
                $clave = (string) round($w['y'], 1);
                $lineas[$clave][] = $w;
            }

            foreach ($lineas as $linea) {
                $texto = '';
                foreach ($linea as $w) {
                    $texto .= ' ' . $w['text'];
                }
                $texto = mb_strtoupper(trim($texto));

                if (str_contains($texto, 'REGISTRO') && str_contains($texto, 'FOTOGRA')) {
                    $ys = array_column($linea, 'y');
                    $ymaxs = array_column($linea, 'ymax');
                    $xs = array_column($linea, 'x');
                    return [
                        'page' => $pagina['page'],
                        'y'    => (max($ys) + max($ymaxs)) / 2,
                        'yMin' => min($ys),
                        'yMax' => max($ymaxs),
                        'x'    => min($xs),
                    ];
                }
            }
        }

        return null;
    }

    /**
     * Identifica la primera imagen correspondiente a la sección REGISTRO FOTOGRÁFICO.
     *
     * Si la página del registro es escaneada (una única imagen por página), devuelve
     * esa imagen de página completa. Si hay varias imágenes en la página, toma la primera
     * en orden de extracción.
     */
    public function identificarPrimeraImagenRegistro(): ?array
    {
        $seccion = $this->localizarSeccionRegistro();
        if ($seccion === null) {
            return null;
        }

        $imagenes = $this->listarImagenes();
        foreach ($imagenes as $img) {
            if ($img['page'] === $seccion['page']) {
                return $img;
            }
        }

        return null;
    }

    /**
     * Extrae el registro fotográfico (imagen PNG) y devuelve su ruta.
     */
    public function extraerRegistroFotografico(): ?string
    {
        $img = $this->identificarPrimeraImagenRegistro();
        if ($img === null) {
            return null;
        }

        $pagina = $img['page'];

        $exe = popplerBin('pdfimages');
        $cmd = escapeshellarg($exe)
            . ' -png -p -f ' . (int) $pagina . ' -l ' . (int) $pagina
            . ' ' . escapeshellarg($this->pdfPath)
            . ' ' . escapeshellarg($this->outDir . '/img');

        $descriptors = [2 => ['pipe', 'w']];
        $proc = proc_open($cmd, $descriptors, $pipes, null, null, ['bypass_shell' => true]);
        if (!is_resource($proc)) {
            throw new RuntimeException('No se pudo ejecutar pdfimages (extracción).');
        }
        proc_close($proc);

        // Los nombres siguen el patrón img-<página>-<num>.png (num = índice por página).
        $pagina = (string) $img['page'];
        foreach ((glob($this->outDir . '/img-' . $pagina . '-*.png') ?: []) as $f) {
            return $f;
        }
        foreach ((glob($this->outDir . '/img-*-' . $img['num'] . '.png') ?: []) as $f) {
            return $f;
        }
        foreach ((glob($this->outDir . '/img-*.png') ?: []) as $f) {
            return $f;
        }

        return null;
    }

    /**
     * Corrige la codificación de textos que no son UTF-8 válido (p. ej. OCR que
     * devuelve bytes de Windows-1252). Si el texto ya es UTF-8 válido, no se toca.
     */
    private function normalizarTexto(string $texto): string
    {
        if ($texto === '' || preg_match('//u', $texto) === 1) {
            return $texto;
        }
        $convertido = mb_convert_encoding($texto, 'UTF-8', 'Windows-1252');
        return preg_match('//u', $convertido) === 1 ? $convertido : $texto;
    }

    /**
     * Determina si una línea normalizada comienza con una etiqueta conocida.
     * Devuelve la clave del campo, o null.
     */
    private function coincideEtiqueta(string $lineaNormalizada): ?string
    {
        foreach (self::CAMPOS_ORDEN as $clave) {
            foreach (self::CAMPOS_ETIQUETAS[$clave] as $etiqueta) {
                $norm = $this->normalizar(mb_strtoupper($etiqueta));
                if ($norm !== '' && str_starts_with($lineaNormalizada, $norm)) {
                    return $clave;
                }
            }
        }
        return null;
    }

    /**
     * Extrae los campos estructurados del formulario de hallazgos a partir del
     * texto extraído. El formulario tiene estructura fija: etiqueta seguida de su valor.
     *
     * @param string[] $texto Texto plano por página (índice 0 = página 1).
     * @return array<string,string>
     */
    public function extraerHallazgo(array $texto): array
    {
        $valores = [];
        foreach (self::CAMPOS_ORDEN as $clave) {
            $valores[$clave] = [];
        }

        $actual = null;
        foreach ($texto as $pagina) {
            $lineas = preg_split('/\r\n|\r|\n/', $pagina) ?: [];
            foreach ($lineas as $linea) {
                $clean = trim($linea);
                $norm = $this->normalizar(mb_strtoupper($clean));

                $match = $this->coincideEtiqueta($norm);
                if ($match !== null) {
                    $actual = $match;
                    continue;
                }

                if ($actual !== null && $clean !== '') {
                    $valores[$actual][] = $clean;
                }
            }
            // Reiniciar contexto al cambiar de página evita arrastrar valores entre páginas.
            $actual = null;
        }

        $resultado = [];
        foreach (self::CAMPOS_ORDEN as $clave) {
            if (empty($valores[$clave])) {
                $resultado[$clave] = '';
                continue;
            }
            $valor = trim(implode("\n", $valores[$clave]));
            if ($clave === 'estadoInfraestructura') {
                $valor = $this->limpiarValorEstadoInfraestructura($valor);
            }
            if ($clave === 'coordenadas' && !$this->tieneFormatoCoordenada($valor)) {
                $resultado[$clave] = '';
                continue;
            }
            $resultado[$clave] = $valor;
        }
        return $resultado;
    }

    /**
     * Elimina de la respuesta la instrucción del formulario
     * "INDIQUE EL NIVEL DE DETERIORO" dejando solo el nivel marcado.
     */
    private function limpiarValorEstadoInfraestructura(string $valor): string
    {
        $lineas = preg_split('/\r\n|\r|\n/', $valor) ?: [];
        $filtradas = [];
        foreach ($lineas as $linea) {
            if (mb_stripos($linea, 'INDIQUE EL NIVEL DE DETERIORO') !== false) {
                continue;
            }
            $filtradas[] = trim($linea);
        }
        return trim(implode("\n", array_filter($filtradas, function ($l) {
            return $l !== '';
        })));
    }

    /**
     * Verifica que un texto parezca una coordenada real
     * (p. ej. "3.394910'N, 76:550641W") y no basura de OCR (atribuciones, etc.).
     */
    private function tieneFormatoCoordenada(string $valor): bool
    {
        return (bool) preg_match(
            '/[-+]?\d{1,3}([.,]\d+)?[°\'"]?\s*[NS].{0,15}[-+]?\d{1,3}([.,]\d+)?[°\'"]?\s*[WE]/i',
            $valor
        );
    }

    /**
     * Orquesta todo el flujo y devuelve el resultado estructurado.
     */
    public function procesar(): array
    {
        $escaneado = $this->esEscaneado();

        // Texto plano (con OCR si es escaneado).
        $texto = $this->extraerTextoPlano();

        $hallazgo = $this->extraerHallazgo($texto);

        // Coordenadas (solo si hay capa de texto; para escaneados se deja vacío).
        $coordenadas = $escaneado ? [] : $this->extraerTextoConCoordenadas();

        $seccion = $this->localizarSeccionRegistro();
        $imagenOriginal = $this->identificarPrimeraImagenRegistro();
        $rutaImagen = $this->extraerRegistroFotografico();

        // Convierte una ruta absoluta dentro de public/ a una URL relativa servida.
        $urlImagen = null;
        if ($rutaImagen) {
            $normalizada = str_replace('\\', '/', $rutaImagen);
            $marker = strpos($normalizada, '/api/tmp/');
            if ($marker !== false) {
                $urlImagen = substr($normalizada, $marker);
            }
        }

        return [
            'ok'           => true,
            'archivo'      => $this->baseName,
            'escaneado'    => $escaneado,
            'paginas'      => count($texto),
            'texto'        => $texto,
            'coordenadas'  => $coordenadas,
            'registro'     => $seccion,
            'hallazgo'     => $hallazgo,
            'imagen'       => [
                'original' => $imagenOriginal,
                'extraida' => $rutaImagen,
                'ruta_abs' => $rutaImagen ? realpath($rutaImagen) : null,
                'url'      => $urlImagen,
            ],
        ];
    }
}
