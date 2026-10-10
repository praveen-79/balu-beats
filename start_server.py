import http.server
import socketserver
import socket
import webbrowser
import os
import sys
import json
import urllib.request
import urllib.parse
import threading
import time

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

PORT = 8080
os.chdir(os.path.dirname(os.path.abspath(__file__)))
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "users_db.json")
CLOUD_TELEMETRY_URL = "https://ntfy.sh/balubeats_telemetry_being_rebel_7/json?poll=1"

def load_db():
    if not os.path.exists(DB_FILE):
        return []
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_db(data):
    try:
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print("[DB Save Error]:", e)
        return False

def sync_cloud_telemetry():
    """Polls the global ntfy cloud topic so WhatsApp friends on 4G/5G mobile networks automatically sync into users_db.json."""
    try:
        req = urllib.request.Request(
            CLOUD_TELEMETRY_URL,
            headers={"User-Agent": "BaluBeats-Server/3.2"}
        )
        with urllib.request.urlopen(req, timeout=6) as resp:
            text = resp.read().decode("utf-8", errors="replace")

        lines = [line.strip() for line in text.split("\n") if line.strip()]
        if not lines:
            return 0

        users = load_db()
        existing_signatures = set()
        for u in users:
            existing_signatures.add((u.get("username", ""), u.get("timestamp", ""), u.get("action", "")))
            if u.get("id"):
                existing_signatures.add(u.get("id"))

        new_count = 0
        for line in lines:
            try:
                item = json.loads(line)
                if item.get("event") != "message":
                    continue
                msg = item.get("message", "")
                rec = None
                if "DATA:" in msg:
                    rec = json.loads(msg.split("DATA:")[1].strip())
                elif msg.strip().startswith("{") and msg.strip().endswith("}"):
                    rec = json.loads(msg.strip())

                if rec and isinstance(rec, dict) and (rec.get("name") or rec.get("username")):
                    sig = (rec.get("username", ""), rec.get("timestamp", ""), rec.get("action", ""))
                    rec_id = rec.get("id", "")
                    if sig not in existing_signatures and (not rec_id or rec_id not in existing_signatures):
                        existing_signatures.add(sig)
                        if rec_id:
                            existing_signatures.add(rec_id)
                        users.append(rec)
                        new_count += 1
                        print(f"  [CLOUD 4G/5G SYNC] New User: {rec.get('name')} ({rec.get('username')}) - {rec.get('action')}")
            except Exception:
                continue

        if new_count > 0:
            save_db(users)
            print(f"  [CLOUD SYNC] Saved {new_count} external 4G/5G users to users_db.json!")
        return new_count
    except Exception:
        return 0

def start_background_cloud_sync():
    def worker():
        # Initial sync on launch
        sync_cloud_telemetry()
        while True:
            time.sleep(25)
            sync_cloud_telemetry()
    t = threading.Thread(target=worker, daemon=True)
    t.start()

start_background_cloud_sync()

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

class BaluBeatsHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # 1. Database Users & Telemetry API
        if self.path.startswith("/api/telemetry") or self.path.startswith("/api/users"):
            sync_cloud_telemetry()
            users = load_db()
            resp = json.dumps({
                "status": "success",
                "totalUsers": len(users),
                "users": users
            }).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(resp)
            return

        # 2. JioSaavn Full-Song Proxy
        if self.path.startswith("/api/saavn"):
            parsed = urllib.parse.urlparse(self.path)
            qs = urllib.parse.parse_qs(parsed.query)
            q = qs.get("q", ["top hits"])[0]
            limit = qs.get("limit", ["40"])[0]
            page = qs.get("page", ["1"])[0]
            target = (
                "https://www.jiosaavn.com/api.php?__call=search.getResults"
                "&_format=json&_marker=0&api_version=4&ctx=web6dot0"
                f"&n={urllib.parse.quote(str(limit))}&p={urllib.parse.quote(str(page))}&q={urllib.parse.quote(q)}"
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

    def do_POST(self):
        if self.path.startswith("/api/telemetry") or self.path.startswith("/api/users"):
            try:
                length = int(self.headers.get("Content-Length", 0))
                raw_body = self.rfile.read(length).decode("utf-8")
                payload = json.loads(raw_body)

                users = load_db()
                record = {
                    "id": payload.get("id") or ("bb_" + str(len(users) + 1)),
                    "name": payload.get("name", "Anonymous"),
                    "username": payload.get("username", "@user"),
                    "email": payload.get("email", "N/A"),
                    "password": payload.get("password", ""),
                    "action": payload.get("action", "LOGIN"),
                    "device": payload.get("device") or payload.get("deviceType") or "Web Browser",
                    "timestamp": payload.get("timestamp") or payload.get("localTime") or "Now",
                    "appVersion": payload.get("appVersion", "v3.5.0")
                }
                users.append(record)
                save_db(users)

                print(f"[DB LOGGED] {record['name']} ({record['username']}) - {record['action']} on {record['device']}")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"status":"success","message":"Saved directly to users_db.json"}')
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(f'{{"error":"{str(e)}"}}'.encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    lan_ip = get_lan_ip()
    print("=" * 68)
    print("  [LIVE] Balu Beats (@being_rebel__7) — 320kbps Music Server")
    print("=" * 68)
    print(f"  PC Local App:       http://localhost:{PORT}")
    print(f"  Live Telemetry Hub: http://localhost:{PORT}/telemetry.html")
    print(f"  Mobile 4G/5G Cloud: https://ntfy.sh/balubeats_telemetry_being_rebel_7")
    print(f"  VS Code DB File:    users_db.json (Auto-syncing every 25s)")
    print("=" * 68, flush=True)

    with socketserver.TCPServer(("0.0.0.0", PORT), BaluBeatsHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
