---
doc: spec
status: approved
---

# ProofPath — Technical Spec

## How This Works, In Plain Language

ProofPath is one small web page served by a local Node.js program. The page lets someone try five fictional evidence files or select a few files of their own. When they ask for analysis, the browser sends the files to the local program; that program checks them and sends one request to Google's Gemini API. The API key stays in the local program and never goes into browser code.

Gemini returns a small, fixed-shape JSON result: summary, events, source references, statuses, missing evidence, and any contradictions. The app checks that references point to files the user actually submitted, then draws the timeline and report from that same result. Uploaded files and results stay in memory; ProofPath does not save them to a database or to disk. Refreshing or closing the page clears the current analysis.

This shape uses a real AI call for both the demo and uploads, while keeping the visual app and file handling small. The tradeoff is that analysis needs a configured Gemini key and internet access. The demo evidence is synthetic. The app will clearly disclose that uploaded files are sent to Gemini, and the hackathon demonstration should use fictional, non-sensitive files only.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`.

1. The browser loads `public/index.html`, styles, and app logic from `server.mjs`. **Try Demo Packet** loads the five included text files; **Upload Evidence** keeps selected `File` objects in browser memory and shows the review list.
2. The user presses **Analyze Evidence**. The browser reads text files as text and encodes supported PDF/image files for transport, then posts file IDs, names, MIME types, and content to `POST /api/analyze`.
3. `server.mjs` enforces the file count, size, and MIME allowlist; checks basic file signatures where applicable; and calls Gemini once with the evidence and a focused extraction prompt. The server does not write uploaded content to disk or log it.
4. Gemini returns JSON in the agreed schema. The server parses and validates it: every source ID must match a submitted file; a Supported event must have a source and extracted detail; a contradiction must cite at least two submitted files. If Gemini identifies an individual unreadable file, mark that file unavailable and validate the rest against the other files. Invalid output becomes a recoverable analysis error, never a success-shaped result.
5. The browser maps IDs to original filenames and shows the summary, chronology, statuses, gaps, and source details. Selecting **View original evidence** opens the selected source from in-memory data. **View evidence report** renders a readable report from the same validated analysis; it does not make a second AI call.
6. If input validation detects an unreadable/unsupported file, the interface identifies it and can analyze the remaining valid files. If the model service or whole request fails, selected files remain in memory and the user can correct the set or retry.

## Stack

- **Node.js 22.21+ (LTS line)** — one local program serves the page and the analysis endpoint. Node's built-in `http`, `fs`, and `fetch` avoid a server framework, bundler, and runtime package dependencies. The `.env` file is loaded by Node's CLI flag. Current Node 22 LTS supports this flag as a stable feature; see [Node releases](https://nodejs.org/en/about/previous-releases) and [Node CLI environment files](https://nodejs.org/api/cli.html#--env-fileif-existsfile).
- **Plain HTML, CSS, and browser JavaScript** — one responsive surface and no frontend build step or component library. The user's requested visual hierarchy and spacing are achievable with native CSS.
- **Google Gemini API, model `gemini-3.1-flash-lite`** — one multimodal, structured-output call handles the small text/image/PDF set. The current model is stable and supports those inputs plus structured output. Its low-latency, cost-effective profile suits bounded extraction. See the [model reference](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite).
- **No database and no npm runtime dependencies** — selected files and the current result exist only in memory. The repository contains the clearly fictional demo files, not user uploads.

## Where It Runs and How Someone Tries It

- **Runtime:** local browser plus Node.js 22.21 or newer; internet access for analysis.
- **Setup:** copy `.env.example` to `.env` and add `GEMINI_API_KEY`. Do not commit `.env`. The key is read by `server.mjs`; it is never sent to the browser.
- **Start:** `npm start` (runs `node --env-file-if-exists=.env server.mjs`). Open `http://localhost:3000`.
- **Demo recording:** select **Try Demo Packet**, wait through the visible analysis state, show the linked timeline and delivery gap, open a source file, then show the report. Keep this run local and use only the synthetic packet.
- **Submission:** the local app plus a short recorded demo and public GitHub repository meet the required demo path. Deployment is optional and is not part of this architecture.

## Look and Feel

Implement `prd.md > Look and Feel`: a calm, modern evidence workspace with subtle case-file influence. Use spacious layout, readable system typography, structured cards, a clear timeline, and restrained, consistent status colors. Keep the landing page uncluttered; make the analysis screen the main workspace. Status must also use a text label and icon/shape, not color alone. Avoid chat bubbles, courtroom imagery, and dense dashboard grids. Use inline SVG icons and no remote fonts or imagery so the page remains self-contained and fast offline.

## Components

### Landing and App Shell

`public/index.html` and the app shell in `public/app.js` show the product heading, explanation, two entry actions, flow preview, role limits, and a short provider/data notice. One client-side view switch changes between landing, upload review, analysis, source detail, and report; there is no multi-page router.
PRD ref: `prd.md > Entry and Evidence Selection`, `prd.md > Look and Feel`.

### Demo Packet

Five small, fictional `.txt` files in `public/demo/` represent seller messages, payment confirmation, order confirmation, promised delivery, and follow-up without clear delivery confirmation. Clicking **Try Demo Packet** submits this exact set through the same live Gemini analysis route as uploads and opens analysis after it finishes; it never asks the reviewer to inspect raw files first. The source detail action can show each included file. Label the contents as synthetic demo evidence.
PRD ref: `prd.md > Entry and Evidence Selection`, `prd.md > The Core Journey`.

### Evidence Selection and Review

`public/app.js` keeps chosen files in memory, enforces a maximum of five files and 2 MB per file, and displays name, type, size, and remove action before analysis. The supported set is `.txt`, `.pdf`, `.png`, and `.jpg`/`.jpeg`; validate both extension and browser MIME where available, then validate on the server. Limit total raw upload to 10 MB. Unsupported items can be removed/replaced; no folders, case library, or persistence.
PRD ref: `prd.md > Entry and Evidence Selection`, `prd.md > States and Boundaries`.

### Local Node Server and Analysis Endpoint

`server.mjs` serves static files and implements `GET /api/health` plus `POST /api/analyze`. It checks request size, MIME types and basic signatures, requires at least one valid file, assigns/validates evidence IDs, and calls Gemini via Node's built-in `fetch`. It holds bytes only while handling the request. Gemini errors, invalid JSON, and semantically invalid citations become structured actionable errors for the browser; never return a fabricated analysis. For clearly unreadable inputs, identify and skip the affected file, report its name/reason, and continue if other valid files remain. The response schema also permits Gemini to flag a specific unreadable file; the server removes that ID from usable evidence, checks that the remaining analysis references only readable files, and marks the source unavailable. If a combined request fails for an unknown reason, preserve all files and allow remove/replace/retry.
PRD ref: `prd.md > Analysis and Evidence Timeline`, `prd.md > States and Boundaries`.

### Analysis Workspace

`public/app.js` renders a neutral summary and chronology, with each event's status, source filename, extracted detail, and concise reason. Supported requires an explicit linked source and detail; Uncertain is used for relevant but ambiguous/conflicting evidence; Missing has no supporting source and names useful evidence to seek. A contradiction must cite two or more different submitted sources. The UI has a no-contradiction state and lets the user open source evidence.
PRD ref: `prd.md > Analysis and Evidence Timeline`.

### Evidence Report

`public/app.js` creates an in-app report view from validated analysis JSON: summary, events, statuses, linked source details, missing evidence, contradictions, and the role/limits note. This deterministic rendering avoids a second AI call and keeps report wording tied to the displayed analysis. No accounts, shared links, or report storage.
PRD ref: `prd.md > Evidence Report`.

## Data Model

All active case data lives in browser memory; the local server holds a request copy only while contacting Gemini. Nothing from a user upload or result is written to a file or database. Returning after refresh starts at the landing page with an empty selection. The fictional demo files are the only evidence stored in the repository.

```text
EvidenceFile {
  id: string, name: string, mimeType: string, size: number,
  text?: string, base64?: string, availability: "ready" | "unavailable",
  issue?: string
}

Analysis {
  summary: string,
  events: [{
    id: string, date: string | null, event: string,
    status: "supported" | "uncertain" | "missing",
    sourceIds: string[], details: string[], why: string
  }],
  fileIssues: [{ fileId: string, reason: string }],
  missingEvidence: [{ event: string, needed: string }],
  contradictions: [{ claim: string, sourceIds: string[], explanation: string }]
}
```

When rendering, map `sourceIds` to the selected `EvidenceFile` names. A `fileIssues` item must identify a submitted file; events cannot cite a file marked unavailable. An unknown source ID, a Supported event without a valid source/detail, or a contradiction with fewer than two distinct source IDs invalidates the response; show a retryable error rather than weakening the evidence rules. This checks source references, not whether a model-produced quotation is perfectly transcribed; reviewers can open the original file to verify the detail.

## File Structure

```text
proofpath/
├── server.mjs                 # Static server, input checks, Gemini API route
├── package.json               # start script and Node version requirement; no packages
├── .env.example               # Key name only; never a real secret
├── .gitignore                 # Local secrets and personal learner profile
├── README.md                  # Setup, data notice, demo walkthrough, limitations
├── public/
│   ├── index.html             # Landing, upload, analysis, source, and report mounts
│   ├── styles.css             # Responsive calm-workspace visual system
│   ├── app.js                 # Client journey, in-memory files, API call, rendering
│   └── demo/
│       ├── seller-messages.txt
│       ├── payment-confirmation.txt
│       ├── order-confirmation.txt
│       ├── delivery-promise.txt
│       └── follow-up.txt
└── devpost/
    ├── learner-profile.md
    ├── scope.md               # Approved product boundary
    ├── scope.html             # Visual scope review
    ├── prd.md                 # Approved product behavior
    ├── prd.html               # Visual PRD review
    └── spec.md                # This technical blueprint
```

## External Services and Dependencies

### Gemini API

- **Service:** Gemini Developer API, `gemini-3.1-flash-lite`.
- **Call:** `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent` with `Content-Type: application/json` and `x-goog-api-key: GEMINI_API_KEY` set by the Node server. The key must never be embedded in HTML, JavaScript, Git, or logs.
- **Request:** one user `contents[].parts[]` payload containing a focused instruction plus each file as extracted `text` or `inline_data` with `mime_type` and base64 `data`; set `generationConfig.response_mime_type` to `application/json` and `response_schema` to the compact analysis schema, including per-file unreadable issues. Restrict output to the timeline/report fields; no web search, grounding, file search, or multi-turn agent.
- **Response:** read candidate text as JSON; validate schema, known file IDs, status rules, and contradiction source count before returning it to the browser. Google notes that schema-conforming output is not necessarily semantically correct, so the product must still preserve source review and uncertainty. See [Generate Content API](https://ai.google.dev/api/generate-content), [structured output guidance](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), [document input guidance](https://ai.google.dev/gemini-api/docs/document-processing), and the [model reference](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite).
- **Key and cost:** create a key in [Google AI Studio](https://aistudio.google.com/app/apikey). Current pricing lists a free tier and, on the paid tier, $0.25 per million input tokens and $1.50 per million output tokens for this model; rates and availability can change. The provider states that free-tier submitted content may be used to improve its products, while paid-tier data is not. This POC therefore prominently tells users to use fictional/non-sensitive evidence only. See [current pricing and data-use terms](https://ai.google.dev/gemini-api/docs/pricing).
- **Retention:** ProofPath does not store uploads; the request is sent to Google for model analysis. The provider's handling is governed by its current terms. The hackathon demo must use synthetic evidence.

### Runtime

No external database, auth provider, hosting service, or frontend package. Node's built-in server and fetch provide local serving and API access; `.env` is loaded with Node's `--env-file-if-exists` option. See [Node HTTP](https://nodejs.org/api/http.html), [Node fetch](https://nodejs.org/api/globals.html#fetch), and [Node CLI env files](https://nodejs.org/api/cli.html#--env-fileif-existsfile).

## Important Failure Modes

- **No API key or no network** → `/api/health` reports setup availability; disable analysis with a clear setup message. Preserve the selected files. No static result is presented as fresh AI analysis.
- **Unsupported, oversized, or obviously unreadable file** → identify the file and reason, allow removal/replacement, and continue with other valid files when possible.
- **Gemini unavailable, request rejected, or output invalid** → show an actionable retry message, preserve the current file selection, and do not render a partial/fabricated success.
- **AI returns unlinked or contradictory references** → server rejects the response for correction/retry; user-facing analysis only renders IDs that map to supplied files.

## What Was Simplified and Why

- One Node process with built-in libraries instead of separate frontend, API server, and framework — reduces setup and failure points for the first CLI-agent build.
- One constrained Gemini request and schema instead of a multi-agent or staged extraction pipeline — enough to demonstrate the single evidence packet while keeping the 2–4 hour target.
- Five fixed fictional text records for the demo, alongside limited PDF/image/text upload support — deterministic input keeps the demo explainable without pretending the output is hand-authored; the displayed analysis is still generated live.
- No database, account, cloud upload storage, or saved cases — uploaded evidence and results stay in memory, which is simpler and avoids app-side retention.
- Build the report view from the validated analysis response rather than a second model call — keeps report content consistent with the timeline and removes another failure point.
- Lightweight contradiction flags only; no verdicts, legal advice, confidence score, or generalized dispute workflow — preserves the approved POC boundary.

## Decisions and Open Issues

- **Implementation recommendation, delegated by the learner:** plain browser code plus Node's built-in server/fetch; one local process, no database or runtime packages. This is a new CLI-agent learning opportunity without adding a framework to learn.
- **Implementation recommendation, delegated by the learner:** use Gemini 3.1 Flash-Lite and one live structured-output request for both demo and uploads. The synthetic packet keeps input consistent; the live path proves AI extraction rather than substituting a static result. Tradeoff: the demo requires a Google AI Studio key and internet access.
- **Implementation detail derived from the scope:** support `.txt`, `.pdf`, `.png`, and `.jpg/.jpeg`, up to five files, 2 MB each, and 10 MB total. Other formats are explicitly unsupported so the build can finish on time.
- **Evidence validation limit:** backend checks that source IDs map to submitted files and enforces citation requirements, but cannot guarantee semantic correctness of model-extracted details. The UI must make opening the original easy and describe the output as assistive evidence organization.
- **Data handling:** the app does not persist evidence, but sends files to Gemini. Because free-tier data may be used to improve Google's products, the visible notice and README must direct users to fictional/non-sensitive evidence.
- **Learning question clarified:** the browser code can be inspected by users, so a secret API key cannot safely live there. Keep `GEMINI_API_KEY` in ignored local `.env` and have the Node server make the provider request.
- **Optional deployment:** not selected; local run and a recorded demo are enough. Decide separately in `6-ship` only if sharing a live URL becomes important.

No unresolved product or architecture decision blocks the build. During the first build step, verify Node availability, Gemini key access, current model availability, and a single structured response before styling the complete flow. If the API key/service cannot be used, pause before replacing real extraction with a static mock; any alternative would need to remain clearly labeled and consistent with the approved AI requirement.
