#!/usr/bin/env python3
"""Create an isolated temporary DB, boot the actual jar, verify Flyway, then remove only that DB."""
import subprocess,time,os,urllib.request,json
from pathlib import Path
from uuid import uuid4
settings=dict(l.split('=',1) for l in Path('.env').read_text().splitlines() if '=' in l and not l.startswith('#'))
name='nivect_test_'+uuid4().hex[:12]
def sql(query,db=None):
    command='psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d '+('"$POSTGRES_DB"' if not db else db)+' -tA'
    return subprocess.check_output(['docker','compose','exec','-T','postgres','sh','-ec',command],input=query,text=True).strip()
proc=None
try:
    sql('CREATE DATABASE '+name+';')
    with open('runtime/fresh-schema.log','w') as log:
        env={**os.environ,**settings,'POSTGRES_DB':name}
        proc=subprocess.Popen(['java','-XX:ActiveProcessorCount=2','-jar','target/qc-0.0.1-SNAPSHOT.jar','--server.port=18080','--qc.mqtt.enabled=false'],env=env,stdout=log,stderr=subprocess.STDOUT)
        for _ in range(60):
            if proc.poll() is not None:raise AssertionError('Fresh backend failed; inspect runtime/fresh-schema.log')
            try:
                if json.load(urllib.request.urlopen('http://127.0.0.1:18080/actuator/health',timeout=2))['status']=='UP':break
            except Exception:pass
            time.sleep(1)
        else:raise AssertionError('Fresh schema readiness timed out')
        assert sql("SELECT count(*) FROM flyway_schema_history WHERE success AND version IN ('1','2','3');",name)=='3'
        assert sql('SELECT count(*) FROM bottle_inspections;',name)=='0'
        print('PASS empty PostgreSQL DB migrates V1-V3 and actual application reaches UP')
finally:
    if proc is not None:
        proc.terminate()
        try:proc.wait(timeout=15)
        except subprocess.TimeoutExpired:proc.kill();proc.wait()
    sql('DROP DATABASE IF EXISTS '+name+';')
