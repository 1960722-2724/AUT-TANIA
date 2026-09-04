import http.server
import socketserver

PORT = 8000
DIRECTORY = "public"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)


with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Servidor en http://localhost:{PORT}")
    print("Login: http://localhost:8000/pages/auth/login.html")
    httpd.serve_forever()