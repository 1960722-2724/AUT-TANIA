<?php
// Genera un PDF de texto simple para validar el pipeline de Poppler.
$pdf = "";
$pdf .= "%PDF-1.4\n";

$content = "BT\n/F1 12 Tf\n72 700 Td\n(INFORME TECNICO AUTN TANIA) Tj\n0 -20 Td\n(Tecnico: Juan Perez) Tj\n0 -20 Td\n(Fecha: 2026-09-07) Tj\n0 -40 Td\n(REGISTRO FOTOGRAFICO) Tj\nET\n";

// objetos
$objects = [];
$objects[] = "<< /Type /Catalog /Pages 2 0 R >>";
$objects[] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
$objects[] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>";
$objects[] = "<< /Length " . strlen($content) . " >>\nstream\n" . $content . "\nendstream";
$objects[] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

$offset = strlen($pdf);
$offsets = [];
$pdf .= "1 0 obj\n" . $objects[0] . "\nendobj\n";
$offsets[1] = $offset; $offset = strlen($pdf);
$pdf .= "2 0 obj\n" . $objects[1] . "\nendobj\n";
$offsets[2] = $offset; $offset = strlen($pdf);
$pdf .= "3 0 obj\n" . $objects[2] . "\nendobj\n";
$offsets[3] = $offset; $offset = strlen($pdf);
$pdf .= "4 0 obj\n" . $objects[3] . "\nendobj\n";
$offsets[4] = $offset; $offset = strlen($pdf);
$pdf .= "5 0 obj\n" . $objects[4] . "\nendobj\n";
$offsets[5] = $offset; $offset = strlen($pdf);

$xrefStart = strlen($pdf);
$pdf .= "xref\n0 6\n0000000000 65535 f \n";
foreach ([1,2,3,4,5] as $n) {
    $pdf .= sprintf("%010d 00000 n \n", $offsets[$n]);
}
$pdf .= "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" . $xrefStart . "\n%%EOF\n";

$tmp = dirname(__DIR__, 3) . '/public/api/tmp';
if (!is_dir($tmp)) {
    mkdir($tmp, 0777, true);
}

file_put_contents($tmp . '/prueba-texto.pdf', $pdf);
echo "PDF generado: " . $tmp . '/prueba-texto.pdf\n';
