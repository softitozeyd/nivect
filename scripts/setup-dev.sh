#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - <<'PY'
from pathlib import Path
import secrets
p=Path('.env');text=p.read_text() if p.exists() else ''
settings={'POSTGRES_DB':'nivect','POSTGRES_USER':'nivect','POSTGRES_PORT':'5432','REDIS_PORT':'6379','MQTT_USERNAME':'nivect','MQTT_PORT':'1883'}
for k in ['POSTGRES_PASSWORD','REDIS_PASSWORD','MQTT_PASSWORD','QC_OPERATOR_PASSWORD','QC_INGEST_PASSWORD']:
    settings[k]=secrets.token_hex(24)
known={line.split('=',1)[0] for line in text.splitlines() if '=' in line}
new=''.join(k+'='+v+'\n' for k,v in settings.items() if k not in known)
if new:
    p.write_text(text+('' if not text or text.endswith('\n') else '\n')+new)
    p.chmod(0o600)
print('Local configuration prepared; existing values preserved. Passwords are in ignored .env.')
PY
docker compose config --quiet
