"""Serve only portal files on localhost. Serial access stays inside the browser."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parent / 'dist'
try:
    server = ThreadingHTTPServer(('127.0.0.1', 7370), partial(SimpleHTTPRequestHandler, directory=str(root)))
except OSError as error:
    print('Cannot start the portal on localhost:7370:', error)
    print('Close an earlier local clock-portal Terminal window and retry.')
    input('Press Return to close. ')
    raise SystemExit(1)

url = 'http://127.0.0.1:7370'
print('737 Clock Control — local Mac version\n' + url, flush=True)
print('Leave this Terminal window open. Press Control-C to stop.\nThe clock is accessed directly by your browser; this server never opens USB.', flush=True)
for name in ['Google Chrome', 'Microsoft Edge']:
    if (Path('/Applications') / (name + '.app')).exists():
        subprocess.Popen(['/usr/bin/open', '-a', name, url])
        break
else:
    print('Open the URL above in desktop Chrome or Edge. Safari does not expose the required serial API.', flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    print('\nPortal stopped.')
finally:
    server.server_close()
