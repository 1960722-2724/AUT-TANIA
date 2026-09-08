#!/usr/bin/env python3
"""
Servidor de desarrollo de AUTN TANIA.

Usa el servidor embebido de PHP (php -S) para poder ejecutar los scripts
del backend (/api/**/*.php) además de servir los archivos estáticos.

Si PHP no está disponible, el servidor Python sigue sirviendo estáticos.
"""
import os
import shutil
import socket
import subprocess
import sys

PORT = 8000
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")


def puerto_disponible(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) != 0


def main():
    php = shutil.which("php")

    if php and puerto_disponible(PORT):
        print(f"Servidor PHP embebido en http://localhost:{PORT}")
        print("Login: http://localhost:8000/pages/auth/login.html")
        # El servidor embebido de PHP es monohilo por defecto: mientras
        # subir.php procesa el PDF no podría atender el polling de progreso
        # (progreso_<token>.json), dejando la barra clavada en 30%.
        # Con PHP_CLI_SERVER_WORKERS el servidor atiende varias peticiones.
        env = dict(os.environ)
        env["PHP_CLI_SERVER_WORKERS"] = "2"
        cmd = [php, "-S", f"0.0.0.0:{PORT}", "-t", PUBLIC_DIR]
        try:
            subprocess.run(cmd, env=env)
        except KeyboardInterrupt:
            sys.exit(0)
        return

    if not php:
        print("PHP no encontrado. Usando servidor estático de Python.")
        print("NOTA: los endpoints /api/pdf/** NO funcionarán sin PHP.")

    # Fallback al servidor estático de Python.
    import http.server
    import socketserver

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

        def end_headers(self):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
            super().end_headers()

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Servidor en http://localhost:{PORT}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
