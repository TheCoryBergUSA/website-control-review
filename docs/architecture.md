# Assessment architecture

## Decision

Website Control Review will be a separate application and deployment from the Pilot My Tech marketing site.

- `pilotmytech.com` explains the offer and directs visitors to request a review.
- `review.pilotmytech.com` will host the intake and eventual report experience.
- This repository owns the review product, its rubric, report templates, test fixtures, and application code.
- Lead and report data belong in an application database, not GitHub.

This keeps the marketing site fast and stable while the assessment capability evolves independently.

## Initial hybrid workflow

```text
Business owner submits URL, business type, and goal
                    |
                    v
Input validation and rate limit checks
                    |
                    v
Evidence collection
  - page metadata and headings
  - first-screen text, links, and calls to action
  - mobile and desktop rendering evidence
  - performance, accessibility, and technical checks
  - platform and third-party dependency fingerprint
                    |
                    v
Deterministic rubric checks plus AI synthesis
                    |
                    v
Draft report with evidence and confidence labels
                    |
                    v
Pilot My Tech human review
                    |
                    v
Delivered report and follow-up invitation
```

## Evidence categories

Every report item must be assigned one category:

| Category | Meaning | Example |
| --- | --- | --- |
| Measured | A tool returned a value. | Mobile performance score is 52. |
| Observed | The system found visible page content. | The hero heading says "We build custom kitchens." |
| Inferred | The rubric or AI formed a judgment from evidence. | The offer is not specific to a clear customer type. |
| Unavailable | A check could not be completed. | A page blocked the renderer. |

## Version one responsibilities

### Intake application

- Collect URL, business type, business goal, and email.
- Collect self-reported control answers for domain, hosting, website administration, analytics, forms, and key third-party services.
- Explain that the report is an assessment, not a guarantee.
- Rate limit requests and surface clear failure states.

### Evidence workflow

- Validate the submitted URL before any fetch.
- Collect a limited, reproducible set of page facts.
- Run technical checks such as performance and basic SEO.
- Detect public platform and dependency signals without attempting authentication.
- Capture first-fold evidence at desktop and mobile widths.

### Platform and dependency fingerprint

The review should identify the likely technical platform and externally visible dependencies when public evidence supports it. This provides useful follow-up questions, not a conclusion about who controls the system.

| Finding type | Examples of permitted evidence | Report treatment |
| --- | --- | --- |
| Platform signal | `wp-content` or `wp-includes` assets, a WordPress generator tag, a public `wp-json` response, or a form action using `admin-ajax.php` | State the likely platform and confidence level, with the exact public signal. |
| Third-party dependency | Public form, booking, chat, analytics, payment, or scheduling endpoint on another domain | Name the observed service or endpoint and ask who owns the account. |
| Admin-path signal | A public link or redirect involving `wp-admin` or `wp-login.php` | Report only that a WordPress administrative path is publicly referenced or reachable. Do not try to sign in or test credentials. |
| Ownership status | Prospect intake answer or verified account access during a separately authorized audit | State as confirmed, self-reported, or unknown. |

Do not infer that an agency, helper company, or any other party has administrator access merely because a site uses WordPress, a public WordPress administrative path exists, or a vendor is credited in the footer. Those clues should create an ownership follow-up question, such as: "Who has administrator access, and is that access documented in the business's name?"

### Report workflow

- Apply the versioned clarity rubric.
- Generate a draft report using only collected evidence.
- Separate measured facts from inference.
- Present platform and dependency findings with an evidence source and a confidence label.
- Require a reviewer approval before delivery.

## Future production architecture

At launch, use a Netlify-deployed front end and protected server-side functions. For longer-running work, create a job record in a database and process it asynchronously. The application should never make a visitor wait while a full report is generated.

```text
Review web app
  -> authenticated assessment API
  -> database job record
  -> background worker
       -> safe page-fetch service
       -> performance data source
       -> rubric engine
       -> LLM report synthesis
  -> reviewer queue
  -> email delivery service
```

The exact database, fetch provider, LLM provider, and email service remain open decisions. Choose them only after the rubric has been tested on real sites.
