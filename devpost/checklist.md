---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Try Demo Packet and see its source-linked AI analysis**
  Becomes usable: A local ProofPath app can send the five fictional evidence records through the real Gemini route and show the returned summary, chronological events, direct source links/details, evidence statuses, missing proof, and any grounded contradictions.
  Why now: Bootstrapping is part of this first end-to-end behavior. It exercises the unfamiliar external AI dependency and proves the unique kernel early; if the live call cannot work, we learn that before polishing the rest.
  PRD ref: `prd.md > The Core Journey` (steps 1–2, 4–5), `prd.md > Analysis and Evidence Timeline`, `prd.md > States and Boundaries`.
  Spec ref: `spec.md > Stack`, `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Components > Demo Packet`, `spec.md > Components > Local Node Server and Analysis Endpoint`, `spec.md > Components > Analysis Workspace`, `spec.md > Data Model`.
  Build: Scaffold the specified Node/static app; create the five synthetic records; implement server-side Gemini request, JSON parsing and citation validation; render the demo-first landing and source-linked analysis with an obvious loading state. Add dependency-free Node tests for analysis validation without changing the runtime architecture.
  Verify (mechanical): Run `node --check` on server/client code and `npm test`; start the app and check `/api/health`; with the local Gemini key configured, run the demo end to end and confirm it returns a valid analysis whose source IDs map to the five demo files. Do not print or commit the key.
  Learner check: Open `http://localhost:3000`, choose **Try Demo Packet**, and check whether the source links make the supported payment and uncertain/missing delivery understandable.
  Commit: `Build live demo evidence analysis`

- [x] **2. Upload and review a controlled evidence set**
  Becomes usable: A user can select up to five supported files, review filename/type/size, remove a file, and analyze the remaining set through the same AI and analysis experience as the demo.
  Why now: It extends the already-working evidence-to-analysis path with the second PRD entry route and original-source access, without introducing file libraries, accounts, or storage.
  PRD ref: `prd.md > The Core Journey` (steps 3–5), `prd.md > Entry and Evidence Selection`, `prd.md > Analysis and Evidence Timeline`.
  Spec ref: `spec.md > Components > Evidence Selection and Review`, `spec.md > Components > Local Node Server and Analysis Endpoint`, `spec.md > Components > Analysis Workspace`, `spec.md > Data Model`.
  Build: Add the `.txt`, `.pdf`, `.png`, and `.jpg/.jpeg` picker and review list; enforce five-file, 2 MB each, and 10 MB total limits in browser and server; pass files in memory; expose originals from analysis; ensure both routes render the same shape.
  Verify (mechanical): Run `node --check` and `npm test`; start the app, analyze a small synthetic text upload, verify the response maps to that selected file, and confirm server rejects empty, unsupported, oversized, and malformed inputs without leaking stack traces or losing the valid selection.
  Learner check: Upload one of the included fictional text records, review/remove it, then analyze the remaining valid set and open its source from the timeline.
  Commit: `Add controlled evidence upload flow`

- [x] **3. Finish recovery states, report, responsive polish, and README**
  Becomes usable: The complete POC has a readable report from the same validated analysis, clear retry/replacement behavior for real failures, a calm responsive interface, setup/data instructions, and an end-to-end demo walkthrough.
  Why now: The kernel and both entry paths are already working, so this slice adds the remaining promised outputs and finishes the experience without expanding the architecture.
  PRD ref: `prd.md > Evidence Report`, `prd.md > States and Boundaries`, `prd.md > Look and Feel`, `prd.md > What We're Building`.
  Spec ref: `spec.md > Components > Evidence Report`, `spec.md > Look and Feel`, `spec.md > Important Failure Modes`, `spec.md > External Services and Dependencies`, `spec.md > Where It Runs and How Someone Tries It`.
  Build: Add in-app report view rendered from the validated response; actionable provider/unreadable-file errors and retry; finish status explanations and privacy notice; polish desktop/mobile layout and keyboard/accessibility basics; complete README with setup, supported files, synthetic-data notice, demo steps, limitations, and test command.
  Verify (mechanical): Run `npm test` and syntax checks; start from a clean terminal using the README instructions; verify health, demo, report, empty/unsupported/oversized inputs, retry state (with provider failure simulated locally), and narrow/mobile layout in a browser. Re-run the live Gemini demo before completion.
  Learner check: Explore the full app, try the demo, upload/remove a supported file, view a source and the report, then test an invalid file and a narrow viewport; report anything confusing or broken.
  Commit: `Complete ProofPath report and resilient demo`

## Hands-on Checkpoints

- [x] Early usable behavior explored — user confirmed live Gemini analysis works; payment event is clearly source-linked, delivery uncertainty/missing evidence is clear.
- [x] Final kick-the-tires exploration and feedback completed — user confirmed upload, remove/add, source, report, invalid-file, and narrow-screen flows work and are understandable; no blocking issues.

## Final Review

- [x] Final review complete — no blocking issues reported; user instructed to commit slice 3 and continue through 6-ship.

## Code Tour and App Map

- [x] Learning activity complete — brief evidence-based recap connected the user’s plan-first goal to the supported-evidence rule, its validator, and tests.
- [x] Optional edit and transfer reflection addressed — no extra edit or reflection prompt added, honoring the user’s request to avoid optional pauses.
- [x] `devpost/app-map.html` generated from finished code and checked; its reference route is explicitly labeled as not toured interactively.

Activity and evidence: Brief recap based on the user’s plan-first learning goal; linked the direct-support acceptance criterion to `server.mjs > validateAnalysis()` and paired pass/fail cases in `test/server.test.mjs`. User completed the final app review and reported all core flows clear with no blocking issues.
Route and stops: Reference-only route in `devpost/app-map.html`: `public/app.js > acceptSelectedFiles()` → `server.mjs > handleAnalyze()/prepareFiles()/callGemini()/validateAnalysis()` → `public/app.js > renderAnalysis()/renderReport()`. No interactive source tour is claimed.
Edit outcome: Not applicable; no optional code edit made.
Reflection: Already covered by the user’s stated plan-first learning outcome; no additional personal reflection requested.
Activity mode: Brief evidence-based recap and offline reference map.

## Revisions

- Verification note: A live five-file Gemini analysis and one-file upload succeeded during the build, and partial analysis correctly flagged a damaged image while analyzing the readable record. A final repeat later received upstream HTTP 503; ProofPath returned its retryable `AI_UNAVAILABLE` state without rendering fabricated analysis. This is an external service availability limitation, not a scope or architecture change.
