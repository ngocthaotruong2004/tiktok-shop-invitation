"""Serve one exported file as an attachment on localhost."""
import argparse
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
from urllib.parse import unquote, urlsplit

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('file', type=Path)
parser.add_argument('--port', type=int, default=8771)
args = parser.parse_args()
download = args.file.resolve(strict=True)

class DownloadHandler(BaseHTTPRequestHandler):
    def do_HEAD(self):
        self.send_download(False)

    def do_GET(self):
        self.send_download(True)

    def send_download(self, body):
        if unquote(urlsplit(self.path).path) != '/' + download.name:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header('Content-Type', mimetypes.guess_type(download.name)[0] or 'application/octet-stream')
        self.send_header('Content-Disposition', f'attachment; filename="{download.name}"')
        self.send_header('Content-Length', str(download.stat().st_size))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        if body:
            with download.open('rb') as source:
                shutil.copyfileobj(source, self.wfile)

server = ThreadingHTTPServer(('127.0.0.1', args.port), DownloadHandler)
print(f'Download ready: http://127.0.0.1:{args.port}/{download.name}', flush=True)
server.serve_forever()
