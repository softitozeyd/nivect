# VisionQC Repository Audit and Validation Report

**Date:** 27 October 2026
**Assessment:** The standalone frontend is healthy after four targeted fixes. All available automated checks pass. It is ready for local demonstrations and frontend staging evaluation. **The integrated production system is not yet validated for deployment.**

## Scope and architecture

The local Git repository is `outputs/visionqc`. Its authored source, tests, dependency manifest/lockfile, TypeScript/Vite/ESLint/Playwright configuration, Docker/Nginx/Compose configuration, and integration documentation were inspected. Generated dependencies were checked with `npm audit` and `npm ls`; third-party package internals were not manually audited line by line.

This repository contains a React 19 / TypeScript frontend with six routes: Overview, Live Monitoring, Inspection History, Stations, Reports, and Settings. Shared domain functions provide filters, status calculations, charts, and CSV export. A Context store manages polling, cancellation, preferences, and demo reviews. Demo and Nivect adapters share an interface. Zod validates the external failure payload. Demo history is bounded to 500 records; API mode reads the latest 20 failures. API mode remains read-only and never silently falls back to simulated data.

No Java/Python backend implementation, database migrations, or database integration tests exist in this local repository. References to Spring Boot/PostgreSQL/Redis/MQTT describe the separately maintained Nivect backend. No changes were made to that remote repository.

Environment: Windows, Node 24.22.0, npm 12.2.0, Chromium through Playwright. Java/Maven executables are absent. The Docker CLI exists, but its Linux engine is unavailable.

## Bugs reproduced and fixed

| Finding                                                                    | Reproduction before the fix                                                                                           | Targeted correction                                                                                                      | Verification                                                                                                                                   |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Multi-defect records disappeared from individual defect filters and search | A record labeled `Multiple defects` with `Cap defect` and `Label defect` returned no results for the cap filter       | Include constituent defects in category matching and searchable text                                                     | A new unit test initially failed, then passed; a new browser test verifies all three API defect filters, text search, and a nonmatching filter |
| Scheduled polling cancelled a slow manual retry                            | Start a pending read, manually retry, then advance the scheduled timer by six seconds: the manual request was aborted | Polling skips while another request owns the active request slot; completion and effect cleanup release that slot safely | A new fake-timer test initially failed, then passed; it also verifies polling resumes after the manual request completes                       |
| Stale backend health still appeared green and UP                           | After 17 seconds without a new response, the global banner showed delayed data while the backend card remained green  | Backend status, badge, and meter now use the same freshness calculation as the rest of the workspace                     | The existing stale-data browser test was strengthened, failed before the fix, and passed afterward                                             |
| The HTTP fixture sent `Cache-Conenol` instead of `Cache-Control`           | A real HTTP response through the Vite proxy had no `cache-control` header                                             | Correct the header spelling in the read-only fixture                                                                     | A proxy response-header assertion initially failed and now passes. This tests Vite plus the fixture, not Nginx                                 |

A misspelled test description and a corrupted sample review note were also corrected. No application features were removed, no architecture was replaced, and no dependencies were added or upgraded.

## Executed test results

Baseline before these audit fixes: 35 unit tests and 21 browser tests passed. New regression assertions then deliberately exposed the four defects above. The final state has no remaining failing executed checks.

| Check                                                   | Final status | Evidence and scope                                                                                                                                                                               |
| ------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`                                     | **PASS**     | Strict TypeScript checking of application, tests, and configuration                                                                                                                              |
| `npm run lint`                                          | **PASS**     | ESLint and React Hooks rules                                                                                                                                                                     |
| `npm test`                                              | **PASS**     | **38/38**, five test files                                                                                                                                                                       |
| `npm run test:e2e`                                      | **PASS**     | **23/23**, 13 demo and 10 API-contract tests; final full run about 2.4 minutes                                                                                                                   |
| `npm run build:api`                                     | **PASS**     | Production API bundle compiled successfully                                                                                                                                                      |
| `npm run build`                                         | **PASS**     | Production demo bundle compiled successfully; this is the current `dist` output                                                                                                                  |
| Production bundle smoke test                            | **PASS**     | Real Chromium against Vite preview on port 5199: six routes at 1440 and 390 pixels, 12 direct-route checks, a saved operator review, and unknown-route navigation back to Overview               |
| Responsive layout                                       | **PASS**     | Existing browser suite covers 1440, 1024, 768, and 390 pixels in demo/API modes; production smoke separately checks desktop/mobile overflow                                                      |
| Automated accessibility                                 | **PASS**     | Axe WCAG 2 A/AA and WCAG 2.1 AA checks on the six routes and demo event dialog. This is not a complete manual accessibility certification                                                        |
| HTTP/API contract and proxy                             | **PASS**     | Controlled JSON fixtures and an actual read-only HTTP fixture through Vite; malformed payloads, HTTP recovery, health states, cancellation, unsupported writes, and multi-defect details covered |
| Browser security regressions                            | **PASS**     | HTML-like API text remains inert; no script dialog or image request is triggered; server image paths remain metadata                                                                             |
| CSV security regressions                                | **PASS**     | Formula-like values in line metadata, image paths, and operator notes are escaped; quotes, decimals, and zero confidence are preserved                                                           |
| `npm audit --json`                                      | **PASS**     | Zero reported known vulnerabilities at execution time                                                                                                                                            |
| `npm ls --depth=0`                                      | **PASS**     | No missing/invalid top-level dependency tree reported                                                                                                                                            |
| Working-tree/history secret pattern scan                | **PASS**     | No findings; 79 historical blobs across three commits scanned. No working-tree `.env` files. Historical `.env.example` is a non-secret example, excluded from the source ZIP                     |
| `git diff --check` and staged diff check                | **PASS**     | No whitespace patch errors in final checks                                                                                                                                                       |
| Spring Boot and database tests                          | **BLOCKED**  | Backend sources/tests are absent locally; Java/Maven unavailable; both localhost:8080 endpoints refused connections                                                                              |
| PostgreSQL, Redis, MQTT and model/edge end-to-end tests | **BLOCKED**  | No running services or confirmed credentials. No database writes or destructive operations attempted                                                                                             |
| Docker build / Compose up / Nginx runtime               | **BLOCKED**  | Docker engine pipe unavailable; configuration reviewed but not executed                                                                                                                          |

The production smoke script initially used an ambiguous heading selector on the unknown-route screen. The probe was corrected to target the level-one heading and rerun successfully. This was a test-selector issue, not an application defect.

## Security findings

- No known dependency vulnerability was reported by the executed npm audit. This is a point-in-time advisory check, not proof that every package or deployment is vulnerability-free.
- No secret patterns were found in the scanned working tree and local Git history. No values matching secrets were printed. Source packaging excludes `.env` files, private-key extensions, Git internals, dependencies, and build/test output directories.
- External API data is schema-validated. The browser security test confirms malicious-looking text is rendered as text. The frontend does not open backend filesystem/image paths automatically.
- Spreadsheet formula protection is present and now tested across untrusted API fields and review notes.
- Real operator writes are unsupported and blocked. The Nginx configuration allows only the two expected GET proxy routes; that runtime restriction remains unverified because Docker is unavailable.
- The current application has no authentication/authorization contract. Live factory deployment needs backend access control and deployment-level TLS/network policy. No credentials or guessed configuration were introduced to bypass this gap.

## Performance observations

Production demo JavaScript is **403,888 bytes**, approximately **123 kB gzip** by the local gzip calculation. CSS is **50,031 bytes**, approximately **11 kB gzip**. Font assets are additional and served locally.

Across the twelve local production navigation samples, heading-visible time ranged from **103 to 492 ms**. No long-task entries were recorded in those short samples. The production smoke observed **zero console errors, zero failing HTTP responses, and zero external requests**.

These measurements are from one local, unthrottled Chromium run. They are not field Core Web Vitals, a load test, a memory-soak test, or a benchmark for factory hardware. The 500-record demo bound and 20-record API bound limit client processing. The confirmed polling cancellation defect was fixed; no other performance bottleneck was established that justified refactoring. Route splitting and bundle budgets can be evaluated when real usage measurements justify them.

## Files changed in this audit

Application fixes:

- `src/domain.ts`: constituent-defect search/category filtering.
- `src/store.tsx`: request ownership, scheduled poll guard, and cleanup.
- `src/features/pages.tsx`: freshness-aware backend health display.

Regression tests and fixture:

- `src/test/domain.test.ts`: multi-defect filtering/search and CSV formula protection; corrected a test description.
- `src/test/store.test.tsx`: slow manual retry plus polling resumption.
- `src/test/stabilization.test.tsx`: corrected an existing sample note.
- `tests/api.spec.ts`: stale health/cache assertions plus filtering and inert-text tests.
- `tests/fixtures/nivect-server.mjs`: corrected cache header.

Evidence and deliverables:

- `docs/repository-audit.md`: this English report.
- `docs/qa-production-smoke.json`: production smoke and performance measurements.
- `docs/screenshots/nivect-qa-production.png`: inspected production screenshot.
- `docs/github-preflight.json`: refreshed secret-scan results.
- `docs/test-report.md`: appended current audit results.
- `../nivect-frontend.zip`: regenerated source handoff package.

Existing staged and unstaged work from earlier tasks was preserved. The broad Git working-tree diff includes previous Nivect adaptation and translation work; it should not be mistaken for the changes made by this audit. No commits, pushes, pull requests, Git authorship changes, or backend/database mutations were performed.

## Remaining limitations and recommended next actions

1. Run the real Nivect backend in an authorized development environment, verify both GET endpoints, and confirm the backend timestamp UTC offset. The current +03:00 interpretation is explicitly an assumption; raw server timestamps remain available in details and CSV.
2. Execute backend service/integration tests and verify Redis queue-to-PostgreSQL persistence plus MQTT/model ingestion. Frontend contract fixtures cannot establish that these systems work together.
3. Execute the frontend Docker build and combined Compose stack. Validate Nginx route fallback, proxy restrictions, backend failure/restart behavior, and actual cache headers.
4. Define backend authentication/authorization and approved review/image/telemetry/history contracts before enabling these capabilities. Current API data cannot provide PASS totals, true production defect rate, camera health, model confidence, or a complete historical archive.
5. Add CI for the now-passing typecheck, lint, unit, browser, and build commands. Retain the lockfile; consider explicit reviewed version ranges in place of `latest`, and immutable image digests during deployment hardening.
6. Schedule manual keyboard/screen-reader review, additional browser engines, real-device testing, sustained polling/memory tests, and network-throttled performance measurements before production acceptance.

## Deployment decision

**Standalone local demo: READY.**
**Frontend staging evaluation: READY, with the integration limitations above.**
**Live integrated factory deployment: NOT YET APPROVED.** Real backend/database/container execution and access-control validation are still blocked or absent. Passing frontend tests does not establish production readiness for the whole inspection system.

Preview: http://127.0.0.1:5197/
[Production smoke evidence](qa-production-smoke.json) · [Production screenshot](screenshots/nivect-qa-production.png) · [API integration contract](api-contract.md)
