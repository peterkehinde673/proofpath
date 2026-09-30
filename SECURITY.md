# Security

## Scope

ProofPath is a local hackathon proof of concept. It accepts user-selected evidence files, keeps them in memory for the active request/session, and sends readable content to Google Gemini for analysis.

## Reporting a vulnerability

Please do not open a public issue containing API keys, private evidence, credentials, or an exploit that could expose them.

If you find a security issue, contact the repository owner privately through GitHub with:

- a short description of the issue;
- the affected file or endpoint;
- reproduction steps that do not include real secrets or private evidence;
- any suggested mitigation.

## Safe use

- Never commit `.env` files or API keys.
- Use fictional or non-sensitive evidence with this proof of concept.
- Treat AI output as assistive analysis and verify important details against the original evidence.
- The local server binds to `127.0.0.1` by default and is not designed as a production public evidence service.
