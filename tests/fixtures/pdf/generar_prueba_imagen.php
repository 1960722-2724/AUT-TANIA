<?php
// Genera un PDF de prueba con texto + una imagen JPEG incrustada debajo de "REGISTRO FOTOGRAFICO".
$tmp = dirname(__DIR__, 3) . '/public/api/tmp';
if (!is_dir($tmp)) {
    mkdir($tmp, 0777, true);
}

// 1. Crear imagen JPEG de ejemplo (una franja de color con texto).
$w = 200;
$h = 100;
$im = imagecreatetruecolor($w, $h);
$blue = imagecolorallocate($im, 46, 59, 146);
$yellow = imagecolorallocate($im, 255, 209, 102);
imagefilledrectangle($im, 0, 0, $w, $h, $blue);
imagestring($im, 5, 20, 40, 'FOTO EJEMPLO', $yellow);
$jpegPath = $tmp . '/foto-ejemplo.jpg';
imagejpeg($im, $jpegPath, 90);
imagedestroy($im);

// 2. Leer los bytes del JPEG.
$jpegData = file_get_contents($jpegPath);

// 3. Construir el content stream de la página:
//    Texto que incluye "REGISTRO FOTOGRAFICO" y una imagen debajo.
//    En coordenadas PDF (origen abajo-izquierda). La imagen se dibuja en la parte baja
//    (y pequeña y crece hacia arriba). La ponemos debajo del texto fotográfico.
//    Texto en y~630-700; imagen en y~400-500 (debajo).
$content = "BT\n/F1 12 Tf\n72 700 Td\n(INFORME TECNICO AUTN TANIA) Tj\n"
    . "0 -20 Td\n(Tecnico: Juan Perez) Tj\n"
    . "0 -20 Td\n(Fecha: 2026-09-07) Tj\n"
    . "0 -40 Td\n(REGISTRO FOTOGRAFICO) Tj\n"
    . "ET\n"
    . "q\n300 400 200 100 re\nW n\n"      // recorte
    . "/Im1 Do\n"                          // dibujar imagen
    . "Q\n";

$objects = [];
$objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
$objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
$objects[3] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] '
    . '/Resources << /Font << /F1 5 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 4 0 R >>';
$objects[4] = '<< /Length ' . strlen($content) . ' >>' . "\nstream\n" . $content . "\nendstream";
$objects[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
$objects[6] = '<< /Type /XObject /Subtype /Image /Width ' . $w . ' /Height ' . $h
    . ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' . strlen($jpegData) . ' >>'
    . "\nstream\n" . $jpegData . "\nendstream";

$pdf = "%PDF-1.4\n";
$offsets = [];
for ($n = 1; $n <= 6; $n++) {
    $offsets[$n] = strlen($pdf);
    $pdf .= $n . " 0 obj\n" . $objects[$n] . "\nendobj\n";
}
$xrefStart = strlen($pdf);
$pdf .= "xref\n0 7\n0000000000 65535 f \n";
for ($n = 1; $n <= 6; $n++) {
    $pdf .= sprintf("%010d 00000 n \n", $offsets[$n]);
}
$pdf .= "trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n" . $xrefStart . "\n%%EOF\n";

file_put_contents($tmp . '/prueba-imagen.pdf', $pdf);
echo "PDF con imagen generado: " . $tmp . '/prueba-imagen.pdf' . "\n";
echo "JPEG: " . $jpegPath . "\n";
