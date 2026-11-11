"""Pure decision and durable delivery primitives, independent of the model runtime."""
import json
import sqlite3
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone

CLASSES = ('bottle', 'underfill', 'missing_cap', 'loose_cap')


def observation(detections, model_version):
    """detections: (class_name, confidence, xyxy). Only one fully visible bottle is accepted."""
    bottles = [d for d in detections if d[0] == 'bottle']
    result = dict(bottleFound=bool(bottles), bottleCount=len(bottles), defects=[], confidence=0.0,
                  modelVersion=model_version,
                  boxes=[dict(label=n, confidence=float(c), xyxy=[float(v) for v in box]) for n,c,box in detections])
    if len(bottles) != 1:
        return result
    _, confidence, (x1,y1,x2,y2) = bottles[0]
    dx,dy = (x2-x1)*.1,(y2-y1)*.1
    defects = []
    for name,score,(a,b,c,d) in detections:
        if name not in CLASSES[1:]:
            continue
        # Associate localized defects to this bottle, allowing cap boxes just above its neck.
        if x1-dx <= (a+c)/2 <= x2+dx and y1-dy <= (b+d)/2 <= y2+dy:
            defects.append(name)
            confidence = min(confidence,score)
    result.update(defects=sorted(set(defects)),confidence=float(confidence))
    return result


class BottleGate:
    """Single-bottle trial: stable observations, then an empty zone before re-arming."""
    def __init__(self, stable=5, empty=5):
        if stable < 1 or empty < 1:
            raise ValueError('Gate counts must be positive')
        self.stable,self.empty=stable,empty
        self.reset()

    def reset(self):
        self.seen=self.absent=0
        self.sent=False
        self.blocked=False
        self.defects=set()
        self.confidence=1.0

    def observe(self, item):
        if not item['bottleFound']:
            self.absent+=1
            if self.absent>=self.empty:
                self.reset()
            return None
        self.absent=0
        if item['bottleCount']!=1:
            self.blocked=True
            return None
        if self.blocked:
            return None
        if self.sent:
            return None
        self.seen+=1
        self.defects.update(item['defects'])
        self.confidence=min(self.confidence,item['confidence'])
        if self.seen<self.stable:
            return None
        self.sent=True
        return dict(eventId=str(uuid4()),bottleFound=True,defects=sorted(self.defects),
                    confidence=self.confidence,modelVersion=item['modelVersion'],source='CAMERA',
                    capturedAt=datetime.now(timezone.utc).isoformat())


class Outbox:
    """SQLite commit precedes delivery; remove only after a successful application ACK."""
    def __init__(self, path):
        Path(path).parent.mkdir(parents=True,exist_ok=True)
        self.db=sqlite3.connect(path)
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('PRAGMA synchronous=FULL')
        self.db.execute('CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, payload TEXT NOT NULL)')
        self.db.commit()

    def add(self, event):
        with self.db:
            self.db.execute('INSERT INTO events VALUES (?,?) ON CONFLICT(id) DO NOTHING',
                            (event['eventId'],json.dumps(event,sort_keys=True)))

    def pending(self):
        return [json.loads(r[0]) for r in self.db.execute('SELECT payload FROM events ORDER BY rowid LIMIT 100')]

    def acknowledge(self, event_id):
        with self.db:
            self.db.execute('DELETE FROM events WHERE id=?',(event_id,))

    def close(self):
        self.db.close()
