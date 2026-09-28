# ProofPath

**Turn scattered evidence into a clear, verifiable story.** ProofPath is a small hackathon proof of concept for organizing records from an online-purchase dispute into a source-linked timeline, evidence gaps, and a readable report.

ProofPath helps organize and compare records. It does not determine who is right, provide legal advice, or establish legal truth.

## Try the demo

Requirements: Node.js 22.21 or newer, a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey), and network access to the Gemini API.

1. Copy `.env.example` to `.env`.
2. Add your key to `GEMINI_API_KEY` in `.env`. Keep this file private; it is ignored by Git.
3. Start ProofPath:

   ```sh
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) and choose **Try Demo Packet**.
5. Follow the timeline sources, check what remains uncertain or missing, and open **View Evidence Report**.

The demo packet is fictional and synthetic. For a quick walkthrough, show the seller conversation and order receipt, the payment confirmation linked to its source, the promised delivery date, the follow-up, and the delivery evidence gap.

## Analyze your own small file set

Choose **Upload Evidence**, select up to five files, review their names/types/sizes, remove any file that should not be included, and select **Analyze Evidence**.

Supported file types are `.txt`, `.pdf`, `.png`, `.jpg`, and `.jpeg`. The limits are 2 MB per file and 10 MB total. Text files are included as text; PDFs and images are sent to Gemini as file content. ProofPath keeps active files in browser memory and does not save them to a database or disk.

**Privacy:** Analysis content is sent to Google Gemini using the key configured on the local server. Provider data handling depends on the account and current Google terms. Use the synthetic demo or other non-sensitive files; do not upload private, financial, identity, or real dispute records to this proof of concept.

## Evidence rules

- **Supported:** a submitted file directly supports the event, and the timeline links to that source and extracted detail.
- **Uncertain:** a relevant source exists but is ambiguous, incomplete, or conflicting.
- **Missing:** the submitted files do not establish the event; the report describes what evidence could help.
- A contradiction must cite at least two distinct submitted files with incompatible details. A missing record alone is not a contradiction.
- If analysis fails or a file is unreadable, ProofPath shows a recovery action and does not invent a result.

AI extraction can be incomplete or incorrect. Open the original evidence and verify each important detail yourself.

## Run checks

```sh
node --check server.mjs
node --check public/app.js
npm test
```

The tests use Node's built-in test runner and have no third-party dependencies.

## How it works

- `public/` contains the responsive interface, client-side file review, timeline, original-source view, and report rendering.
- `server.mjs` serves the static app, validates file limits and analysis citations, and calls Gemini with a focused structured-output request.
- Evidence is held in memory for the current session and request. Only the five synthetic demo records are stored in the repository.
- The report is rendered from the same validated analysis shown in the timeline; it does not make a second AI call.
- `devpost/` contains the approved scope, PRD, technical specification, and build checklist.

## Proof-of-concept limits

ProofPath is a single-case demonstration, not a production evidence system. It has no accounts, persistent storage, OCR pipeline, legal review, automatic fact verification, or sharing service. Its source checks validate that citations point to submitted files and satisfy the status rules; they cannot prove that model-extracted text is accurate. Review the original file for every important claim.
