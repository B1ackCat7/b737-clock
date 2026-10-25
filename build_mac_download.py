"""Reproducibly package the local browser app, launcher, and public guides."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

root = Path(__file__).resolve().parent
output = root / 'dist' / '737-clock-mac.zip'
paths = [root / name for name in [
    'Start Clock Portal.command', 'launcher.py', 'MAC_README.txt',
    'README.md', 'VERSION', 'CHANGELOG.md',
]]
# Include the release guides explicitly; keep private/history notes out of downloads.
paths += [root / 'docs' / name for name in [
    'USER_GUIDE.md', 'ONLINE_TIME_SYNC.md', 'PROTOCOL.md', 'REFERENCES.md', 'VALIDATION.md',
]]
paths += list((root / 'docs' / 'images').glob('*.png'))
paths += [p for p in (root / 'dist').iterdir() if p.suffix in {'.html', '.css', '.js'}]
with ZipFile(output, 'w', compression=ZIP_DEFLATED) as archive:
    for path in sorted(paths):
        relative = path.relative_to(root)
        entry = ZipInfo('737 Clock Control/' + str(relative), (2026, 10, 24, 0, 0, 0))
        entry.compress_type = ZIP_DEFLATED
        entry.create_system = 3
        entry.external_attr = (0o100755 if path.suffix == '.command' else 0o100644) << 16
        archive.writestr(entry, path.read_bytes())
print(output)
