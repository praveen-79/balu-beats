import http.server
import socketserver
import socket
import webbrowser
import os
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

PORT = 8080
os.chdir(os.path.dirname(os.path.abspath(__file__)))

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

import urllib.request
import urllib.parse

class BaluBeatsHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_GET(self):
        if self.path.startswith("/api/saavn"):
            parsed = urllib.parse.urlparse(self.path)
            qs = urllib.parse.parse_qs(parsed.query)
            q = qs.get("q", ["top hits"])[0]
            limit = qs.get("limit", ["20"])[0]
            target = (
                "https://www.jiosaavn.com/api.php?__call=search.getResults"
                "&_format=json&_marker=0&api_version=4&ctx=web6dot0"
                f"&n={urllib.parse.quote(str(limit))}&p=1&q={urllib.parse.quote(q)}"
            )
            try:
                req = urllib.request.Request(target, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=8) as r:
                    data = r.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(data)
            except Exception as e:
                self.send_response(502)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(f'{{"error": "{str(e)}"}}'.encode("utf-8"))
            return
        super().do_GET()

socketserver.TCPServer.allow_reuse_address = True

lan_ip = get_lan_ip()
print("=" * 62)
print("  [LIVE] Balu Beats (@being_rebel__7) — 320kbps Full Music App")
print("=" * 62)
print(f"  PC URL:            http://localhost:{PORT}")
print(f"  Mobile Wi-Fi URL:  http://{lan_ip}:{PORT}  (Open on Phone)")
print(f"  Shareable File:    Balu_Beats_App.html")
print("=" * 62, flush=True)

with socketserver.TCPServer(("0.0.0.0", PORT), BaluBeatsHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")

