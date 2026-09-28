---
doc: prd
status: approved
---

# ProofPath — Product Requirements

ProofPath helps an everyday consumer turn records from an online-purchase dispute into a source-linked timeline, clear evidence gaps, and a neutral report.
Source: `scope.md > Who It's For`, `The Unique Kernel`.

## The Core Journey

1. The consumer opens a focused landing/workspace page that explains ProofPath and its limits. They can start with **Try Demo Packet** or choose **Upload Evidence**. The demo action is the fastest route.
2. **Try Demo Packet** opens the completed analysis for a fictional online purchase. The user sees the useful result first and can open the original packet from the analysis view.
3. **Upload Evidence** lets the consumer select a small set of supported files. A review step lists each file's name, type, and basic information, with a way to remove it. The user chooses **Analyze Evidence** to continue.
4. Both paths show a lightweight processing state and lead to the same analysis view. A recoverable problem identifies affected files and offers correction or retry; failed analysis never gets filled with invented evidence.
5. The analysis presents a short case summary, chronological events linked to source files and extracted supporting details, evidence statuses, missing evidence, and contradictions only when the files conflict. The user can inspect original files and open the final report.
6. The report presents a neutral, readable account of the events and their evidence, preserving uncertainty and the product's limits.

## Screens and Layout

- **Landing/workspace:** One uncluttered responsive entry screen with the requested heading and explanation, two prominent actions, a compact Evidence → Timeline → Evidence Status → Report preview, and the trust/scope note. **Try Demo Packet** is the easiest path.
- **Upload review:** A simple selected-file list showing filename, file type, basic file information, and remove action; an **Analyze Evidence** action; clear empty and invalid-file feedback. This is a step in the same flow, not a file-management dashboard.
- **Analysis:** The main evidence workspace. Show summary, chronological timeline entries with visible source links and supporting details, immediately understandable Supported / Uncertain / Missing states, contradictions when found, a concise Missing Evidence section, an action to view original files, and an action to view/generate the report.
- **Report:** A focused readable report view, accessible from the analysis. No separate sharing or case-management surface is required.

## Look and Feel

Calm, modern evidence workspace with subtle case-file influence: clean and professional without feeling corporate, dramatic, or legalistic. Use structured evidence cards and timeline entries, clear relationships and hierarchy, restrained status colors, readable typography, generous spacing, and responsive behavior across desktop and mobile. Avoid generic AI-chat styling, courtroom/legal-services visuals, and complicated enterprise dashboards.

## Features and Behavior

### Entry and Evidence Selection

Develops `scope.md > The Core Loop` and `What "Working" Looks Like`.

- The landing page explains the product and provides **Try Demo Packet** and **Upload Evidence**.
- **Try Demo Packet** opens the finished analysis for the fictional online-purchase packet without requiring the user to inspect raw files first. Original files remain accessible from analysis.
- **Upload Evidence** opens the file picker for a small, controlled set of supported evidence formats.
- After selection, show each file's filename, type, and basic information, allow removal, and show **Analyze Evidence**. Adding folders, bulk case management, accounts, or cloud storage is out of scope.
- No selection shows a helpful message and keeps analysis unavailable until at least one valid file is selected. Unsupported or invalid files are identified clearly and can be removed or replaced.

### Analysis and Evidence Timeline

Develops `scope.md > The Unique Kernel`, `The Core Loop`, and `The POC Boundary`.

- The analysis view begins with a short neutral summary and a chronological timeline.
- Each timeline event shows **Event → Status → Source evidence → Extracted supporting detail**. Source evidence names the specific file and, where available, the relevant text, date, amount, or other extracted detail.
- **Supported** means one or more files directly support the event or claim. Every Supported event must have an explicit evidence link; plausibility or a logically implied event is not enough.
- **Uncertain** means relevant evidence exists but does not establish the event confidently, or is ambiguous or conflicting.
- **Missing** means the submitted files cannot establish the event; identify what evidence would help verify it.
- Include a short “Why this status?” explanation when useful. Never frame statuses as a legal conclusion or as a determination of truth.
- Contradictions are lightweight, evidence-based flags for specific incompatible details found across files (such as a conflicting date, amount, or delivery account). If none are identified, say no contradiction was detected in the submitted evidence. Do not label a mere evidence gap as a contradiction.
- A **View original evidence** action opens the source files or their details from the analysis.
- A **View evidence report** action opens the report generated from the analysis.

### Evidence Report

Develops `scope.md > What "Working" Looks Like` and `The Unique Kernel`.

- The report presents the case summary, chronological events, each event's status and source detail, relevant contradictions, and missing evidence in plain language.
- Keep the tone neutral and readable. Preserve uncertainty and distinguish file-supported statements from gaps.
- Include a brief scope note that ProofPath organizes submitted evidence; it does not determine who is right, provide legal advice, or establish legal truth.
- A report is available after successful analysis. No account, public link, or sharing feature is required.

## States and Boundaries

- **First use:** Explain the purpose and limits; offer the demo and upload paths. The demo can be entered without setup.
- **File review:** Show the selected files and enable analysis only when at least one valid supported file is present.
- **Processing:** Show a lightweight indication that analysis is underway.
- **Empty or invalid selection:** Explain that a valid supported file is needed; identify unsupported or invalid items and allow removal/replacement.
- **Partial file failure:** Identify the affected file and reason when known. Preserve selected files and continue with successfully processed evidence where possible; mark the affected evidence unavailable and never fabricate extracted results. Let the user remove/replace the problem file and retry.
- **Analysis service unavailable:** Explain the failure, preserve the selected files, and provide **Retry analysis**.
- **No contradiction found:** State that none was detected in the submitted evidence; do not manufacture one.
- **Successful analysis:** Show the shared analysis view and make original evidence and report accessible.
- **Evidence boundary:** The system only reports what submitted files support, leave uncertain, or fail to establish. It does not infer plausible facts or decide legal truth.

## Product Decisions

- The first user is an everyday consumer handling an online-purchase or service dispute; the demo uses one fictional online purchase. (`scope.md > Who It's For`, `What "Working" Looks Like`)
- The demo opens completed analysis first; original evidence remains accessible from analysis.
- Uploads use a small controlled set and a review-before-analysis step; both paths converge on one analysis experience.
- Status labels follow strict evidence-grounded definitions, and every Supported event has an explicit source link.
- Contradiction flags require incompatible details in evidence. Missing evidence is not itself a contradiction.
- Analysis failures must be actionable and recoverable without losing selections or inventing evidence.
- Visual identity is a calm, modern evidence workspace, not a chat app, legal-services site, or enterprise dashboard.

## What We're Building

- Responsive landing/workspace, selected-file review, analysis, and report views.
- One fictional purchase-dispute packet and a small controlled upload flow.
- Focused extraction of event details needed for chronology, evidence status, gaps, contradictions, and the report.
- A source-linked timeline with strict Supported / Uncertain / Missing meanings.
- Recoverable empty, invalid-file, partial-file, and analysis-service failure states.
- A neutral report derived from the evidence analysis.

## Deferred From the POC

- General-purpose support for many case types or arbitrary large evidence collections — would exceed the single scenario and time limit.
- Accounts, cloud storage, sharing links, collaboration, payments, chat, and case-management dashboards — do not prove the Evidence → Timeline → Missing Proof → Report flow.
- Legal advice, verdicts, or a determination of who is right — outside the product's purpose and unsupported by this evidence organizer.
- Advanced contradiction reasoning or confidence scoring — a lightweight, traceable flag is enough for the demo.

## Possible Later Enhancements

Additional dispute scenarios and evidence formats could follow after the single-packet flow proves useful. More robust evidence review and export could be considered separately.

## Non-Goals

- ProofPath will not decide who is right, guilty, or legally entitled to a remedy.
- ProofPath will not state an event as Supported without explicit source evidence.
- ProofPath will not invent events, evidence, or statuses when extraction or analysis fails.
- The POC will not become a general-purpose evidence platform or manage user accounts and cases.

## Open Questions

- Exact supported file formats and size/count limits are implementation choices for `4-spec`; the product requirement is to expose a small, controlled set and explain invalid formats.
- The analysis provider and whether the fictional packet uses the same live analysis path are technical/reliability choices for `4-spec`; both entry paths must produce the same user-visible analysis structure, and errors must remain recoverable.
