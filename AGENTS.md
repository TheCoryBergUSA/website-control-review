# Website Control Review - AI Development Guide

This repository defines and will implement Pilot My Tech's Website Control Review. The review helps an independent business understand whether its website is clear, credible, measurable, and under the business's control.

## Non-negotiable rules

1. Never use em dashes in code, content, metadata, documentation, commits, or user-facing messages. Use commas, parentheses, colons, or hyphens instead.
2. Visually review every user-facing interface change before considering it complete. Build the application, inspect the affected route at 1440px desktop and 390px mobile widths, and check for clipping, overlap, unreadable contrast, broken navigation, or layout regressions. If visual review cannot be performed, say so clearly and do not call it verified.
3. Update SEO whenever public content or page structure could affect it. Review the title, description, canonical URL, Open Graph metadata, sitemap, robots directives, structured data, internal links, image alt text, and heading hierarchy. Record the review in the changelog.
4. Maintain `CHANGELOG.md` for every meaningful change. Use the standard entry fields exactly and do not rewrite older entries except to correct an error.

## Product integrity rules

- Keep measured facts, page observations, AI inferences, and unavailable checks visibly separate in every report.
- Never present an AI inference as a measured fact.
- Every recommendation must cite the specific page evidence that supports it.
- The rubric in `docs/scoring-rubric.md` is the product source of truth. Update it deliberately, test it against fixtures, and record version changes.
- Human review is required before sending reports during the initial hybrid phase.
- Do not make claims about accessibility, legal compliance, security, conversion rate, or business outcomes unless the evidence and scope support the claim.

## Website-fetching safety

- Accept only `http` and `https` URLs.
- Block localhost, private IP ranges, link-local addresses, cloud metadata endpoints, and redirects to any of them.
- Apply request timeouts, size limits, and rate limits before fetching a submitted site.
- Keep API keys and credentials in deployment environment variables. Never commit them.
- Do not collect or store page credentials, form submissions from assessed sites, or personal data that is not necessary for the prospect relationship.

## Required completion workflow

1. Read the relevant documentation and this guide.
2. Make the smallest coherent change that fulfills the request.
3. Run the production build and fix all errors and warnings.
4. Perform the required visual review for user-facing changes.
5. Review affected SEO settings for public content changes.
6. Add a changelog entry before committing.
7. Commit with a clear, imperative message and push only when authorized.

## Changelog format

```md
## YYYY-MM-DD - short change title

- Type: content | design | feature | fix | infrastructure | seo | rubric
- Scope: affected routes, components, or files
- Summary: what changed and why
- Visual review: passed | not performed, plus viewports or constraint
- SEO review: no change needed | updated, plus affected settings
- Build: passed | not run
```
