# Product foundation and release boundary

This change supplies an integrated development/product foundation. It is **not a
claim of production acceptance** or trained model accuracy. No public deployment
or hardware actuation has been performed.

## Design

The supplied video is used as a visual reference: warm architectural scene,
serif/sans headlines, restrained navigation, staggered three-card layout, generous
spacing, muted greens, scroll reveals, FAQ and closing CTA. PET bottles, inspection
areas and defect classes replace the reference product's interior-design content.
The original 3D hero was removed at the user’s request. The hero and supporting
sections use selected, locally hosted PET footage supplied by the user. Clips are
muted H.264 with fast-start metadata and poster fallbacks; they pause offscreen
and when the tab is hidden. A global pause/play control and reduced-motion default
are included. See [media selection](media.md).
The operator workspace follows the same visual system with functional controls.
Desktop/mobile Chromium coverage includes session login, records, CSV, FAQ,
responsive navigation, simulated webcam preview and logout.

## Local environment

Run `scripts/setup-dev.sh`, `scripts/build.sh`, optional local model installation,
then `scripts/dev.sh` as described in README. Existing `.env` values are preserved.
Never create another worktree just for setup; cloud tasks already have isolation.
Build artifacts and browser outbox are not source code. Browser queued events
live in IndexedDB and survive reloads. Do not clear site data before pending
counts reach zero. Storage/permission failure stops inference instead of reporting
success. Only use one active inference tab per physical camera; multi-tab camera
ownership is not coordinated. Close the camera before changing its device.

## Containers

`docker compose --profile app up -d --build --wait --wait-timeout 180` builds
frontend + backend and publishes only loopback 8080. Frontend build output is not
committed. The app runs as UID 10001. No `.env`, datasets or weights are embedded.

In the managed cloud, use the additive CA build override:

```bash
docker compose -f compose.yaml -f compose.cloud.yaml --profile app build backend
docker compose --profile app up -d --no-build --wait --wait-timeout 180
```

For the optional model container, place trusted weights in ignored `models/best.pt`
and use `-f compose.yaml -f compose.vision.yaml --profile app up -d --build`.
This CPU image installs model dependencies and is heavier than the base web app.
The model service exposes no host port. Its health endpoint distinguishes service
availability from loaded-model readiness. Do not publish port 9000 externally.
The optional model image needs the same platform CA build secret when built in
this cloud. Local model service without weights is the tested default; GPU model
execution requires hardware-specific installation and validation.

## Training and model promotion

The current checkpoint is the YOLO11m model trained on 10 November 2026.
See the [model setup instructions](getting-started.md#pc-kamerası-ve-gerçek-tespit)
for its checksum and installation path. Field performance still requires
an independent camera trial. For future runs, `training/train.py` requires a reviewed manifest with
`image,split,bottle_id,session_id`; rejects cross-split bottle/session IDs and
identical-image leakage, checks the canonical class order and supplies the
manifest's actual image lists to training. YOLO image/label layout is required.

```bash
.venv/bin/python training/train.py --data data/pet/data.yaml \
  --manifest data/pet/manifest.csv --checkpoint models/pretrained.pt --device 0
```

The checkpoint must be a trusted local file. `.pt` files can execute serialized
Python code; never load arbitrary user-uploaded checkpoints. Training requires
the model dependency environment and the actual dataset/GPU. It writes a model
card (weight/manifest hashes, dependency version, split counts, held-out metrics)
with `fieldApproved=false`. The model service derives its modelVersion from the
weight hash and refuses a class-order mismatch. Restart it to load another model.
Ultralytics licensing (AGPL/commercial) must match the intended distribution.

The initial gate is for a PC camera with one bottle at a time, not a validated
multi-object conveyor tracker. A stable sequence emits one event, then an empty
zone is required to re-arm; ambiguous multi-bottle scenes remain blocked until
empty. It cannot guarantee identity across occlusions, stream restarts or an
application crash before event generation. Defects observed *after* the first
stable decision are not retrospectively applied. Set a physical inspection zone
and observation period from line measurements before conveyor use. No-bottle
frames do not count as products. PASS means no covered defect at the configured
confidence, not proof of universal quality. Confidence is not calibrated accuracy.

## Durable storage and migration

New events go directly into a PostgreSQL transaction. `event_id` is unique;
concurrent identical retries commit once. Failure/timeout retains the producer's
outbox. SQLite outbox uses WAL + FULL synchronous commits; the browser uses
IndexedDB transactions. Host disk loss still requires backup/retention strategy.
Redis is kept for compatibility/health, but its previous transient List is no
longer the commit path. Before upgrading an existing installation, stop old
producers, inspect its list length, and preserve/convert pending legacy payloads;
this change does not silently delete or reinterpret them.

Flyway baseline version 0 preserves the existing schema. V1 creates the legacy
base when empty; V2 backfills deterministic UUIDs and LEGACY source, and adds
metadata/indexes; V3 enforces source/result constraints. Back up before upgrading.
Unexpected legacy schema variations must be reviewed; do not disable Flyway
checks to force an upgrade. Historical times are retained unchanged.

`./scripts/backup-db.sh` creates a private custom-format dump and checks its archive
catalog. Copy it to approved off-host storage. An archive-catalog check is not a
restore test. For a restore drill, create an isolated PostgreSQL database and run
`pg_restore --exit-on-error --no-owner` into it, compare counts, then run an isolated
backend against it. Never restore destructively into the running production DB.

## Before actual production release

Concrete remaining acceptance work:

- Train with reviewed labels and physically independent train/val/test data.
  Include multiple lighting/background/brand sessions appropriate to the product.
- Measure class-wise misses/false rejects and REVIEW rate on held-out **own-line**
  bottles. Choose acceptance thresholds with the operator and validate line speed.
- Validate the actual PC camera, exposure/focus, mounting, occlusions and throughput.
  A simulated browser camera test does not validate those conditions.
- Configure TLS ingress, `QC_SECURE_COOKIE=true`, private DB/broker networks,
  individual user identity/roles (OIDC or equivalent) and secret rotation. The
  included two local accounts are an initial operator/camera separation, not an
  enterprise identity or multi-tenant system. Sessions are in memory, not shared
  between replicas. Do not assume horizontal scaling without session routing.
- Add centralized audit/security logging, monitoring/alerts, retention and verified
  off-host backup/restore. Test disk exhaustion and outages at intended load.
- Add application-level MQTT result receipts/quarantine before using MQTT as the
  sole durable camera delivery protocol. Current reliable adapter uses HTTP.
- Review dependency/image security and software licenses at release time. Pin
  optional inference runtimes to the target CPU/GPU platform and test real weights.
- PLC/rejector/siren integration needs its own fail-safe design and hardware
  acceptance; no physical output is sent by this product foundation.

These are product release gates, not instructions to fabricate passing evidence.
