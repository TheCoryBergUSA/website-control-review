# Website Control Review

Website Control Review is Pilot My Tech's assessment product for independent businesses. It combines objective website evidence with a structured business-clarity review, then produces practical priorities for making a site clearer, more credible, and easier for the business to control.

## Product promise

A report should help a business owner answer:

1. Is it immediately clear what we do and who we help?
2. Does the first screen give a visitor a reason to act?
3. Is there one obvious next step?
4. Is the website technically sound enough to support the business?
5. Does the business own and understand the technology it depends on?

## Current phase

The first release is a hybrid workflow. The system gathers evidence and drafts a report. A Pilot My Tech reviewer checks it before it is delivered. Full automation is not a goal until the rubric proves reliable against real websites.

## Documentation

- [Assessment architecture](docs/architecture.md)
- [Scoring rubric](docs/scoring-rubric.md)
- [Report method](docs/report-method.md)

## Planned repository layout

```text
apps/
  review-web/              Public intake and report experience
  review-worker/           Protected evidence and report workflow
packages/
  rubric/                  Versioned scoring logic
  report-template/         Report schema and prompt templates
fixtures/
  sample-sites/            Approved test inputs and captured evidence
  expected-reports/        Human-reviewed expected outputs
docs/                       Product method and operating decisions
```

## Development standards

Read [AGENTS.md](AGENTS.md) before making changes. It contains requirements for visual review, report integrity, security, SEO, and changelog entries.
