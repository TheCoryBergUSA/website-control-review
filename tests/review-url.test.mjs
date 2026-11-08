import assert from "node:assert/strict";
import test from "node:test";
import { buildReport, inspectHtml, normalizeUrl } from "../scripts/review-url.mjs";

test("normalizes a domain into an https URL", () => {
  assert.equal(normalizeUrl("example.com").href, "https://example.com/");
});

test("rejects non-web protocols", () => {
  assert.throws(() => normalizeUrl("file:///tmp/page.html"), /public http or https URL/);
});

test("finds clarity, SEO, contact, and WordPress evidence", () => {
  const html = `
    <html><head>
      <title>Acme Heating</title>
      <meta name="description" content="Fast heating repair">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="canonical" href="https://example.com/">
    </head><body>
      <h1>Fast heating repair for Fairfax homes</h1>
      <p>Get your heat restored today.</p>
      <a href="/contact">Request service</a>
      <a href="tel:+15551212">Call us</a>
      <form action="/wp-admin/admin-ajax.php"></form>
      <img src="/wp-content/theme/logo.png">
      <script src="https://booking.example-service.com/widget.js"></script>
    </body></html>`;
  const inspection = inspectHtml(html, new URL("https://example.com/"));
  assert.deepEqual(inspection.headings.h1, ["Fast heating repair for Fairfax homes"]);
  assert.equal(inspection.description, "Fast heating repair");
  assert.equal(inspection.hasPhone, true);
  assert.equal(inspection.imagesMissingAlt, 1);
  assert.match(inspection.platformSignals.join(" "), /wp-content/);
  assert.match(inspection.platformSignals.join(" "), /admin-ajax/);
  assert.deepEqual(inspection.externalHosts, ["booking.example-service.com"]);
});

test("creates a report that separates evidence from reviewer judgment", () => {
  const inspection = inspectHtml("<title>Example</title><h1>Example service</h1>", new URL("https://example.com/"));
  const report = buildReport(
    { requestedUrl: "https://example.com", finalUrl: "https://example.com/", status: 200 },
    inspection,
    { businessType: "Consulting", goal: "Get inquiries" }
  );
  assert.match(report, /What this does not establish/);
  assert.match(report, /Human and AI review worksheet/);
  assert.match(report, /Business type \| Consulting/);
});
