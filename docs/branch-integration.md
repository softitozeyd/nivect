# Main branch integration — 6 November 2026

All fetched development branches are included through normal Git ancestry, with
no squashing or replacement of their original author/commit histories:

| Branch | Incorporated through |
| --- | --- |
| work | current Nivect product foundation, footage and control design |
| backend/inspection-history | merge parent; bounded recent-history API retained |
| frontend/language-options | ancestor of inspection-history; Turkish/English historical UI retained |
| integration/frontend-backend | ancestor of language-options; historical adapter retained |
| frontend/visionqc-demo | ancestor of integration/frontend-backend; historical demo retained |
| backend/service-connections | already in the original main history |
| infrastructure/postgres-port-5432 | already in service-connections/main history |
| docker-infrastructure | already in the original main history |

## Conflict decisions

`frontend/` remains the most recently user-approved Nivect UI, including the PET
footage, camera preview, authenticated workspace and shared motion controls.
Its package manifest, lockfile and HTML entry point are unchanged by this merge.
The other branch introduced an independent TypeScript/VisionQC frontend. Its
complete tracked tree, including language options, tests, documentation and
screenshots, was copied and verified against that branch before relocation to
`legacy/frontend/`. Its original source files remain available; the historical
README is annotated, the optional container defaults to demo mode, and the nested
compose context points to its new location. Historical documentation remains a
record of that implementation, not a readiness claim for the current backend.

The current backend preserves durable/idempotent writes, validation, CSRF and
role separation. `GET /api/v1/inspections` now returns the latest 100 records in
descending capture-time/ID order, protected by operator authorization. It uses
the current PET schema, including REVIEW. UTC JVM configuration from the earlier
integration branch is retained. The old unauthenticated boolean API contract is
not restored; the historical API adapter requires migration before live use.

## Running each frontend

Current application: use the repository root README and build/start scripts.

Historical demo (with Turkish/English preferences):

```bash
cd legacy/frontend
npm ci
npm run dev -- --port 5197
```

The optional root `compose.frontend.yaml` builds the historical demo under the
explicit `legacy` profile; the current app remains bundled in the backend on
8080. The historical PowerShell proxy check is retained in `legacy/scripts/`.
The root `scripts/test-frontend.ps1` runs the current authenticated UI checks.

## Validation

- Current frontend production build passed.
- Java verify passed with 6 tests, including the newly retained history service.
- Historical frontend TypeScript/production build passed.
- Historical frontend: 40 tests passed across 6 files, including language options.
- Current frontend is byte-for-byte unchanged from the work branch.
- Deployment/API/browser validation results are recorded with the final merge.

The root CI workflow verifies the current stack and runs a separate Node 24 job
for the historical frontend. No branches are removed as part of integration.

Final verification: the merged Docker image built and all four infrastructure/app
services reached healthy. The authenticated integration suite passed against the
running merged backend, including GET /api/v1/inspections, its 100-record bound
and camera-role rejection. All 4 current Chromium tests passed against the
packaged application. No legacy live-backend compatibility is claimed.
