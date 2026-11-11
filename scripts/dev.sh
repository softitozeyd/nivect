#!/usr/bin/env bash
# Foreground supervisor: runtime processes must restart after snapshots/restoration.
set -euo pipefail
cd "$(dirname "$0")/.."
./scripts/setup-dev.sh
docker compose up -d --wait --wait-timeout 180
mkdir -p runtime
if [ ! -f target/qc-0.0.1-SNAPSHOT.jar ]; then
  echo 'Build first: ./scripts/build.sh' >&2; exit 1
fi
running_jar="$(mktemp runtime/qc-running-XXXXXX.jar)"
cp target/qc-0.0.1-SNAPSHOT.jar "$running_jar"
vision_pid='';backend_pid=''
cleanup(){ if [ -n "$backend_pid" ]; then kill "$backend_pid" 2>/dev/null || true; wait "$backend_pid" 2>/dev/null || true; fi; if [ -n "$vision_pid" ]; then kill "$vision_pid" 2>/dev/null || true; wait "$vision_pid" 2>/dev/null || true; fi; rm -f "$running_jar"; }
trap cleanup EXIT INT TERM
# The model service is private. No model configured is a supported explicit waiting state.
if [ -x .venv/bin/uvicorn ]; then
  .venv/bin/uvicorn camera.server:app --host 127.0.0.1 --port 9000 > runtime/vision.log 2>&1 & vision_pid=$!
else
  echo 'Optional model service: python3 -m venv .venv && .venv/bin/pip install -r camera/requirements.lock'
fi
java -XX:ActiveProcessorCount=4 -jar "$running_jar" > runtime/backend.log 2>&1 & backend_pid=$!
for attempt in $(seq 1 90); do
 if curl -fsS http://127.0.0.1:8080/actuator/health 2>/dev/null | python3 -c 'import json,sys; assert json.load(sys.stdin)["status"]=="UP"' 2>/dev/null; then
  echo 'Nivect started. operator password: local ignored .env (QC_OPERATOR_PASSWORD).'; wait "$backend_pid"; exit $?
 fi
 if ! kill -0 "$backend_pid" 2>/dev/null; then tail -60 runtime/backend.log; exit 1; fi
 sleep 1
done
echo 'Backend readiness timed out; inspect runtime/backend.log.' >&2
exit 1
