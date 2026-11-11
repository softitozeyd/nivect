#!/usr/bin/env python3
"""Local opt-in outage drill. Stops/restarts this checkout's development PostgreSQL only."""
import os,sys,json,subprocess,tempfile,time,urllib.error
from pathlib import Path
from uuid import uuid4
from datetime import datetime,timezone
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from camera.client import Backend
from camera.engine import Outbox

if os.environ.get('QC_RUN_OUTAGE_TEST')!='yes':
    raise SystemExit('Set QC_RUN_OUTAGE_TEST=yes only on the isolated local development stack.')
settings=dict(l.split('=',1) for l in Path('.env').read_text().splitlines() if '=' in l and not l.startswith('#'))
backend=Backend('http://127.0.0.1:8080',settings['QC_INGEST_PASSWORD']);backend.login()
event=dict(eventId=str(uuid4()),lineCode='recovery-'+uuid4().hex[:12],cameraId='test-pc',bottleFound=True,defects=[],confidence=.9,modelVersion='recovery-test',source='CAMERA',capturedAt=datetime.now(timezone.utc).isoformat())
with tempfile.TemporaryDirectory() as tmp:
    outbox=Outbox(Path(tmp)/'events.db');outbox.add(event)
    try:
        subprocess.run(['docker','compose','stop','postgres'],check=True,stdout=subprocess.DEVNULL)
        try:backend.deliver(outbox)
        except urllib.error.HTTPError as e:assert e.code==503,e.code
        else:raise AssertionError('Storage outage unexpectedly acknowledged an event')
        assert len(outbox.pending())==1
    finally:
        subprocess.run(['docker','compose','up','-d','--wait','--wait-timeout','90','postgres'],check=True,stdout=subprocess.DEVNULL)
    for _ in range(20):
        try:backend.deliver(outbox);break
        except Exception:time.sleep(1)
    assert outbox.pending()==[]
    operator=Backend('http://127.0.0.1:8080',settings['QC_OPERATOR_PASSWORD'],'operator');operator.login()
    records=operator.call('/api/v1/records?source=CAMERA&line='+event['lineCode'])
    assert sum(x['eventId']==event['eventId'] for x in records['items'])==1
    sql="DELETE FROM bottle_inspections WHERE event_id='"+event['eventId']+"'::uuid;"
    subprocess.run(['docker','compose','exec','-T','postgres','sh','-ec','psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'],input=sql,text=True,check=True,stdout=subprocess.DEVNULL)
    outbox.close()
print('PASS storage outage returns 503, durable outbox survives, recovery commits exactly one event')
