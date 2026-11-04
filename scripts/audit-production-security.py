"""Read-only checks. Never print environment values or matching secret content."""
import json
import re
import subprocess
from pathlib import Path
root = Path(__file__).resolve().parents[1]
report = {}
tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
report['trackedSensitiveEnvironmentFiles'] = [path for path in tracked if path and any(part.startswith('.env') for part in Path(path).parts)]
report['envLocalIgnored'] = subprocess.run(['git', 'check-ignore', '-q', '.env.local'], cwd=root).returncode == 0
history = subprocess.check_output(['git', 'log', '--all', '--format=%H', '--', '.env*', '**/.env*'], cwd=root).decode().splitlines()
report['sensitiveEnvHistoryCommitCount'] = len(history)
secrets = {}
path = root / '.env.local'
if path.exists():
    for line in path.read_text().splitlines():
        match = re.match(r'\s*(CLOUDINARY_API_SECRET|CLOUDINARY_API_KEY)\s*=\s*(.*?)\s*$', line)
        if match:
            value = match[2].strip().strip('\"\'')
            if len(value) >= 8: secrets[match[1]] = value.encode()
report['checkedCredentialNames'] = sorted(secrets)
report['credentialValueHits'] = []
checked = 0
for directory in ['src', 'public', 'out', '.next/static']:
    for path in (root / directory).rglob('*'):
        if not path.is_file(): continue
        content = path.read_bytes()
        checked += 1
        for name, value in secrets.items():
            if value in content: report['credentialValueHits'].append({'credentialName': name, 'file': str(path.relative_to(root))})
report['scannedFiles'] = checked
report['unsupportedRuntimeFiles'] = [str(path.relative_to(root)) for path in (root / 'src').rglob('*') if path.is_file() and (path.name in ['middleware.ts', 'proxy.ts', 'route.ts', 'route.js'])]
report['pendingGitChanges'] = len(subprocess.check_output(['git', 'status', '--porcelain'], cwd=root).decode().splitlines())
report['passed'] = not report['trackedSensitiveEnvironmentFiles'] and report['envLocalIgnored'] and not report['credentialValueHits'] and not report['unsupportedRuntimeFiles']
(root.parent / 'data/reports/final-qa/security.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({key: value for key, value in report.items() if key != 'checkedCredentialNames'}, indent=2))
