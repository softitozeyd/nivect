# Nivect API v1

Same-origin web interface and API. All times supplied as ISO 8601 UTC/offset.
Entity responses retain `inspectedAt` as a UTC local datetime for compatibility.
Clients must interpret it as UTC. Historical LEGACY rows retain their original
clock values; no timezone correction is guessed during migration.

## Authentication

`GET /api/auth/csrf` returns `{token, headerName}` and a session cookie.
Send that token using the returned header on every POST, including login.
`POST /api/auth/login` accepts URL-encoded `username` and `password`; returns 200
on success or 401 on failure. Fetch a new CSRF token after login.
`GET /api/auth/me` returns username/roles. `POST /api/auth/logout` returns 204.
Use an HTTP cookie jar. Basic auth is not enabled. Passwords are never stored in
browser storage. Sessions expire after eight hours and on backend restart.
Login requests are limited to 30/minute per actual peer IP per instance.
A trusted ingress must provide a distributed rate limit for a scaled deployment.

## Submit an inspection

`POST /api/v1/inspections`, `Content-Type: application/json`:

```json
{
  "eventId": "be83d714-d6c3-47a5-88c4-7ea62c6d9131",
  "lineCode": "line-1",
  "cameraId": "pc-1",
  "bottleFound": true,
  "defects": ["underfill"],
  "confidence": 0.94,
  "modelVersion": "pet-validated-checkpoint",
  "source": "CAMERA",
  "capturedAt": "2026-11-06T08:00:00Z"
}
```

All fields are required. `eventId` must be a UUID and stable across retries.
Line/camera codes accept letters, digits, underscores and hyphens (50/80 chars).
Defects: `underfill`, `missing_cap`, `loose_cap`; duplicates are rejected.
Confidence must be 0..1. Future captures >5 minutes are rejected.
The camera account may submit only CAMERA. Operator may submit CAMERA or MANUAL.
MANUAL is explicitly a connectivity test, not a learned model result.

202 returns the committed record including its ID and `overallResult`. A retry
with the identical DTO returns the same record. Reusing the UUID with changed
content (including capture time or defect order) returns 409. Keep the complete
original payload in the outbox. The server SHA-256 hash is internal.
503 means storage unavailable; preserve the event and retry. Do not infer success
from a timeout; retry that same UUID. HTTP errors never authorize clearing an outbox.

## Query (operator only)

- `GET /api/v1/overview?source=CAMERA&hours=24&line=line-1`: totals, hourly series,
  defect counts, latest recorded camera events, server time. Camera event history
  is not a heartbeat or a claim that a physical camera is currently online.
- `GET /api/v1/records?source=CAMERA&hours=24&result=ALL&page=0&size=20`: items,
  total, page, pages. Size 1..100; page nonnegative; hours 1..720.
- `GET /api/v1/inspections/failures`: most recent 20 FAIL records, all sources.
- `GET /api/v1/export`: CSV with the same filters, newest 10,000 rows maximum.
  Values are quoted and spreadsheet formula prefixes are escaped.
- `GET /api/v1/vision/status`: service/model readiness and backend confidence
  threshold. Offline and unloaded are explicit states; no simulated inference.
- `POST /api/v1/vision/frame`, JPEG bytes ≤2MB: forwards to the private configured
  model service. At most two in-flight requests per instance; 429 when busy.
  Returns detections, bottleCount, defects, confidence and modelVersion. Does not
  itself create an inspection record. The camera gate/outbox produces events.
- `GET /actuator/health`: public UP/DOWN without internal connection details.

Sources: CAMERA / MANUAL / LEGACY / ALL. Results: PASS / FAIL / REVIEW / ALL.
Empty `line` means all lines. Summary numbers include only selected source/time.

## MQTT compatibility

Topic `production/+/inspections`, QoS 1, retain false. Same JSON DTO; CAMERA only.
The subscriber waits for DB commit before manual ACK. Invalid messages are not
ACKed; fix the publisher or remove an identified poison message through broker
operations. Malformed-message quarantine is not implemented. A publisher must
not treat MQTT PUBACK as a database commit receipt. Prefer the included HTTP
outbox adapter for reliable producer-to-application confirmation.
