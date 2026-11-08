#!/usr/bin/env node

import { lookup } from "node:dns/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const MAX_REDIRECTS = 5;
const MAX_BYTES = 1_000_000;
const REQUEST_TIMEOUT_MS = 10_000;
const USER_AGENT = "PilotMyTechReviewBot/0.1 (public website review)";

export function normalizeUrl(value) {
  const candidate = value.trim();
  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(candidate) ? candidate : `https://${candidate}`;
  const url = new URL(withProtocol);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Enter a public http or https URL.");
  }
  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not allowed.");
  }

  return url;
}

function isPrivateIpv4(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIpv6(address) {
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

function isBlockedHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "metadata.google.internal" ||
    host === "169.254.169.254"
  );
}

export async function assertPublicUrl(url) {
  if (isBlockedHostname(url.hostname)) {
    throw new Error("That address is not a public website.");
  }

  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error("The domain did not resolve to a public address.");

  for (const { address, family } of addresses) {
    if ((family === 4 && isPrivateIpv4(address)) || (family === 6 && isPrivateIpv6(address))) {
      throw new Error("That address is not a public website.");
    }
  }
}

export async function fetchPublicHtml(startUrl) {
  let current = startUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    await assertPublicUrl(current);
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml"
      }
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The site returned a redirect without a destination.");
      if (redirectCount === MAX_REDIRECTS) throw new Error("The site redirected too many times.");
      current = new URL(location, current);
      continue;
    }

    if (!response.ok) throw new Error(`The site returned HTTP ${response.status}.`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error("The URL did not return an HTML page.");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("The site returned an empty response.");
    const chunks = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BYTES) {
        await reader.cancel();
        throw new Error("The page is larger than this review runner permits.");
      }
      chunks.push(value);
    }

    const html = new TextDecoder().decode(concatenate(chunks, totalBytes));
    return { html, requestedUrl: startUrl.href, finalUrl: current.href, status: response.status };
  }

  throw new Error("Unable to fetch the public page.");
}

function concatenate(chunks, totalBytes) {
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function decodeHtml(value = "") {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function attribute(tag, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*(["'])(.*?)\\1`, "i");
  return tag.match(pattern)?.[2]?.trim() || "";
}

function allMatches(html, pattern) {
  return [...html.matchAll(pattern)];
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

export function inspectHtml(html, pageUrl) {
  const withoutNonVisible = html.replace(/<(script|style|noscript|template)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const title = decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const metaTags = allMatches(html, /<meta\b[^>]*>/gi).map((match) => match[0]);
  const descriptionTag = metaTags.find((tag) => attribute(tag, "name").toLowerCase() === "description");
  const robotsTag = metaTags.find((tag) => attribute(tag, "name").toLowerCase() === "robots");
  const canonicalTag = allMatches(html, /<link\b[^>]*>/gi)
    .map((match) => match[0])
    .find((tag) => attribute(tag, "rel").toLowerCase().split(/\s+/).includes("canonical"));

  const headings = {};
  for (const level of [1, 2, 3]) {
    headings[`h${level}`] = unique(
      allMatches(withoutNonVisible, new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)<\\/h${level}>`, "gi"))
        .map((match) => decodeHtml(match[1]))
    ).slice(0, 10);
  }

  const links = allMatches(withoutNonVisible, /<a\b([^>]*)>([\s\S]*?)<\/a>/gi).map((match) => ({
    text: decodeHtml(match[2]),
    href: attribute(match[1], "href")
  }));
  const buttons = allMatches(withoutNonVisible, /<button\b[^>]*>([\s\S]*?)<\/button>/gi).map((match) => decodeHtml(match[1]));
  const ctaPattern = /\b(contact|quote|estimate|book|schedule|call|start|get started|request|consult|buy|order|apply|learn more)\b/i;
  const callsToAction = unique([...links.map((link) => link.text), ...buttons].filter((text) => ctaPattern.test(text))).slice(0, 15);
  const forms = allMatches(withoutNonVisible, /<form\b([^>]*)>/gi).map((match) => ({
    action: attribute(match[1], "action") || "same page or script-handled",
    method: attribute(match[1], "method") || "not stated"
  }));
  const pageText = decodeHtml(withoutNonVisible);
  const firstText = pageText.slice(0, 2200);
  const externalHosts = unique(
    allMatches(html, /(?:src|href|action)\s*=\s*(["'])(.*?)\1/gi)
      .map((match) => match[2])
      .filter((value) => /^https?:\/\//i.test(value))
      .map((value) => {
        try {
          return new URL(value, pageUrl).hostname;
        } catch {
          return "";
        }
      })
      .filter((hostname) => hostname && hostname !== pageUrl.hostname)
  );

  const platformSignals = [];
  const lowerHtml = html.toLowerCase();
  if (lowerHtml.includes("/wp-content/")) platformSignals.push("Public assets reference /wp-content/.");
  if (lowerHtml.includes("/wp-includes/")) platformSignals.push("Public assets reference /wp-includes/.");
  if (/name\s*=\s*["']generator["'][^>]*content\s*=\s*["'][^"']*wordpress/i.test(html)) {
    platformSignals.push("A public generator tag identifies WordPress.");
  }
  if (lowerHtml.includes("wp-json")) platformSignals.push("The public page references a WordPress REST endpoint.");
  if (lowerHtml.includes("admin-ajax.php")) platformSignals.push("The public page references WordPress admin-ajax.php.");
  if (lowerHtml.includes("wp-admin") || lowerHtml.includes("wp-login.php")) {
    platformSignals.push("The public page references a WordPress administrative path.");
  }

  const structuredDataCount = allMatches(html, /<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1[^>]*>/gi).length;
  const imagesMissingAlt = allMatches(withoutNonVisible, /<img\b[^>]*>/gi).filter((match) => !/\balt\s*=/i.test(match[0])).length;
  const formText = forms.length ? "Present" : "Not found in fetched HTML";

  return {
    title,
    description: decodeHtml(attribute(descriptionTag || "", "content")),
    robots: decodeHtml(attribute(robotsTag || "", "content")),
    canonical: attribute(canonicalTag || "", "href"),
    headings,
    firstText,
    callsToAction,
    forms,
    formText,
    externalHosts,
    platformSignals,
    structuredDataCount,
    imagesMissingAlt,
    hasViewport: /<meta\b[^>]*name\s*=\s*(["'])viewport\1/i.test(html),
    hasEmail: /mailto:/i.test(html),
    hasPhone: /tel:/i.test(html),
    wordCount: pageText ? pageText.split(/\s+/).length : 0
  };
}

function markdownList(items, empty = "None found") {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : `- ${empty}`;
}

function tableRow(label, value) {
  return `| ${label} | ${value || "Not found"} |`;
}

export function buildReport(fetchResult, inspection, { businessType = "", goal = "" } = {}) {
  const timestamp = new Date().toISOString();
  const h1 = inspection.headings.h1.map((heading) => `“${heading}”`);
  const reviewQuestions = [
    "What does this business help a visitor do?",
    "Who is it for?",
    "What practical or emotional problem is named?",
    "What result can a customer expect?",
    "What should a ready visitor do next?"
  ];

  return `# Website Control Review evidence packet

## Run details

| Item | Value |
| --- | --- |
${tableRow("Requested URL", fetchResult.requestedUrl)}
${tableRow("Final URL", fetchResult.finalUrl)}
${tableRow("HTTP status", String(fetchResult.status))}
${tableRow("Collected", timestamp)}
${tableRow("Business type", businessType)}
${tableRow("Business goal", goal)}

## What the runner observed

### First-screen evidence to review

**H1 headings**
${markdownList(h1, "No H1 found")}

**Opening page text, extracted from source order**

> ${inspection.firstText || "No readable page text found."}

**Calls to action**
${markdownList(inspection.callsToAction)}

**Contact path signals**

${markdownList([
  inspection.formText === "Present" ? "A form is present in the fetched HTML." : "No form was found in the fetched HTML.",
  inspection.hasEmail ? "An email link is present." : "No email link was found.",
  inspection.hasPhone ? "A phone link is present." : "No phone link was found."
])}

## Basic page and SEO evidence

| Check | Observed value |
| --- | --- |
${tableRow("Title", inspection.title)}
${tableRow("Meta description", inspection.description)}
${tableRow("Canonical URL", inspection.canonical)}
${tableRow("Robots directive", inspection.robots)}
${tableRow("Viewport meta tag", inspection.hasViewport ? "Present" : "Not found")}
${tableRow("Structured-data script blocks", String(inspection.structuredDataCount))}
${tableRow("Images without an alt attribute", String(inspection.imagesMissingAlt))}
${tableRow("Approximate readable-word count", String(inspection.wordCount))}

**H2 headings**
${markdownList(inspection.headings.h2.map((heading) => `“${heading}”`))}

## Public platform and dependency evidence

**Likely platform**

${inspection.platformSignals.length ? `WordPress signal, based on public evidence:\n${markdownList(inspection.platformSignals)}` : "No WordPress signal was found in the fetched page source. This is not proof that the site is not WordPress."}

**External service hosts observed**
${markdownList(inspection.externalHosts, "No external hosts found in the fetched HTML")}

**What this does not establish**

- It does not establish who owns the domain, hosting, analytics, website administrator account, or any third-party account.
- It does not test logins, forms, credentials, security posture, legal compliance, or accessibility compliance.
- It does not render the page, so it cannot make a desktop or mobile visual-layout finding.

## Human and AI review worksheet

Use the evidence above with the scoring rubric in [docs/scoring-rubric.md](../docs/scoring-rubric.md). Keep every conclusion labeled as observed, inferred, measured, or unavailable.

### First-fold clarity questions

${reviewQuestions.map((question) => `- ${question}\n  - Evidence:\n  - Assessment: observed | inferred | unavailable\n  - Notes:`).join("\n")}

### Rubric dimensions, score 0 to 3

| Dimension | Score | Evidence | Reviewer note |
| --- | ---: | --- | --- |
| Audience and offer clarity |  |  |  |
| Customer problem |  |  |  |
| Desired outcome |  |  |  |
| Primary call to action |  |  |  |
| Plan and reduced uncertainty |  |  |  |
| Guide and trust |  |  |  |
| Success and cost of inaction |  |  |  |
| Message focus and friction |  |  |  |

### Control questions for the business owner

- Who owns the domain registration, hosting account, source code, and analytics property?
- Who has administrator access to the website and its plugins or integrations?
- Who owns each form, booking, chat, payment, scheduling, and email-marketing account?
- Can the business make an approved change, preview it, and recover from a mistake without depending on one outside party?

### Draft report priorities

1. **Highest:**
   - Evidence:
   - Why it matters:
   - Suggested change:
   - Classification:
2. **Important:**
   - Evidence:
   - Why it matters:
   - Suggested change:
   - Classification:
3. **Later:**
   - Evidence:
   - Why it matters:
   - Suggested change:
   - Classification:
`;
}

async function readInputs() {
  const suppliedUrl = process.argv[2];
  const suppliedBusinessType = process.argv[3] || "";
  const suppliedGoal = process.argv.slice(4).join(" ");
  if (suppliedUrl) return { url: suppliedUrl, businessType: suppliedBusinessType, goal: suppliedGoal };

  const terminal = createInterface({ input, output });
  try {
    const url = await terminal.question("Website URL: ");
    const businessType = await terminal.question("Business type (optional): ");
    const goal = await terminal.question("Business goal (optional): ");
    return { url, businessType, goal };
  } finally {
    terminal.close();
  }
}

async function main() {
  const { url: rawUrl, businessType, goal } = await readInputs();
  const url = normalizeUrl(rawUrl);
  output.write(`Collecting public evidence from ${url.href}...\n`);
  const fetchResult = await fetchPublicHtml(url);
  const inspection = inspectHtml(fetchResult.html, new URL(fetchResult.finalUrl));
  const report = buildReport(fetchResult, inspection, { businessType, goal });
  const slug = new URL(fetchResult.finalUrl).hostname.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  const date = new Date().toISOString().slice(0, 10);
  const reportPath = resolve("reports", `${date}-${slug}.md`);
  await mkdir(resolve("reports"), { recursive: true });
  await writeFile(reportPath, report, "utf8");
  output.write(`Done. Review packet saved to ${reportPath}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    output.write(`Review could not run: ${error.message}\n`);
    process.exitCode = 1;
  });
}
