# Summary

<!-- One line: what changes and why. -->

## Type
- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Docs
- [ ] Chore / CI

## Checklist
- [ ] `npm run verify` passes locally (typecheck + lint + tests + secret-scan)
- [ ] Tests cover the change (or N/A — explain)
- [ ] No new dependency *or* an ADR is added under `docs/`
- [ ] Every new DB query filters by `tenant_id`
- [ ] No PII (full email) appears in logs, errors, or UI without masking
- [ ] No secret committed (`.env*` ignored, scanner clean)
- [ ] CodeRabbit review addressed

## Screenshots / evidence

<!-- Drop screenshots, log snippets, or grill-me transcripts. -->
