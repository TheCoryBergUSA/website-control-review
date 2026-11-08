# Local review runner

The local review runner is the first practical tool for Website Control Review. It collects repeatable public evidence, then creates a Markdown evidence packet for a human and AI-assisted clarity review.

It is deliberately not an automatic scorecard or a customer-facing report generator. It makes the research portion fast and consistent while leaving business judgment, page rendering, and final recommendations to a reviewer.

## Run a review

From this repository, enter:

```sh
npm run review
```

The runner asks for:

1. Website URL
2. Business type, optional
3. Business goal, optional

It saves a packet at `reports/YYYY-MM-DD-domain.md`. Reports are excluded from Git because they are prospect work product and may contain relationship notes.

You can also enter all details in one command:

```sh
npm run review -- https://example.com "HVAC contractor" "Generate service calls"
```

## What it checks

- Redirect-aware public URL validation
- Page title, description, canonical URL, robots directive, viewport tag, headings, structured-data script count, and image alt-attribute count
- Opening text in source order, H1 and H2 headings, calls to action, forms, email links, and telephone links
- Public WordPress signals: `wp-content`, `wp-includes`, WordPress generator, `wp-json`, `admin-ajax.php`, and public references to `wp-admin` or `wp-login.php`
- Externally referenced hosts, which can prompt an ownership conversation about booking, forms, analytics, chat, payments, or other services
- A ready-to-fill rubric and three-priorities template

## What it intentionally does not check

- It does not use login pages, credentials, or form submissions.
- It does not establish who owns an account or has administrator access.
- It does not run a browser, so it does not make visual, mobile-layout, or performance findings.
- It does not diagnose security, legal compliance, accessibility compliance, or conversion outcomes.

## Review flow

1. Run the command and open the generated Markdown packet.
2. Load the site in a browser at desktop and mobile width. Add only firsthand observations to the worksheet.
3. Use the [scoring rubric](scoring-rubric.md) to assess clarity, not aesthetic preference.
4. Ask an AI to help draft priorities from the cited evidence, then review the draft yourself.
5. Put the polished assessment and relationship notes in the business's Notion CRM record.

## Safety boundaries

The runner permits only public HTTP and HTTPS URLs, checks DNS before each request and redirect, blocks local or private addresses, uses a timeout, and caps downloaded HTML at 1 MB. It should be used only for sites you have a legitimate business reason to review.
