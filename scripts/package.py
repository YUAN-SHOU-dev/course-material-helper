"""Build allowlisted ZIPs; exclude node_modules, old archives and local user data."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'extension/manifest.json').read_text())['version']
dist = root / 'dist'
dist.mkdir(exist_ok=True)
common = ['README.md', 'INSTALL.md', 'AI_INSTALL.md', 'PRIVACY.md', 'DEVELOPING.md', 'CHANGELOG.md', 'COMPATIBILITY.md']
source_dirs = ['extension', 'tests', 'scripts', 'qa']
source_files = [root / name for name in common + ['package.json', 'package-lock.json', '.gitignore']]
for dirname in source_dirs:
    source_files += [p for p in (root / dirname).rglob('*') if p.is_file() and p.suffix != '.pyc' and '__pycache__' not in p.parts]
source_files += [root / 'docs/preview-1.2.0.png', root / 'docs/verification.json']
runtime_files = [root / name for name in common] + [root / 'docs/preview-1.2.0.png'] + [p for p in (root / 'extension').rglob('*') if p.is_file()]
outputs = []
for label, files in [('source', source_files), ('extension', runtime_files)]:
    filename = f'course-material-helper-v{version}-{label}.zip'
    top = f'course-material-helper-v{version}-{label}'
    hashes = {}
    with zipfile.ZipFile(dist / filename, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(files):
            rel = path.relative_to(root).as_posix()
            data = path.read_bytes()
            hashes[rel] = hashlib.sha256(data).hexdigest()
            info = zipfile.ZipInfo(f'{top}/{rel}', (1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
        info = zipfile.ZipInfo(f'{top}/FILE_SHA256.json', (1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, json.dumps(hashes, ensure_ascii=False, indent=2) + '\n')
    with zipfile.ZipFile(dist / filename) as archive:
        assert archive.testzip() is None
        for rel, digest in hashes.items():
            assert hashlib.sha256(archive.read(f'{top}/{rel}')).hexdigest() == digest
    outputs.append((filename, hashlib.sha256((dist / filename).read_bytes()).hexdigest()))
    print(f'{filename}: {len(files)} files, {(dist / filename).stat().st_size:,} bytes; content hashes verified')
(dist / 'SHA256SUMS.txt').write_text(''.join(f'{digest}  {name}\n' for name, digest in outputs))
