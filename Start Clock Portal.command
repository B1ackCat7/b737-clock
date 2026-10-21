#!/bin/zsh
set -eu
cd -- "${0:A:h}"
if ! command -v python3 >/dev/null 2>&1; then
  print 'Python 3 is required to serve this local browser version. The hosted version does not need Python.'
  read '?Press Return to close.'
  exit 1
fi
python3 launcher.py
