import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const distDirectory = fileURLToPath(new URL("../dist/", import.meta.url));

function collectHtml(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectHtml(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
}

function requireText(html, value, message) {
  if (!html.includes(value)) throw new Error(message);
}

function forbidText(html, value, message) {
  if (html.includes(value)) throw new Error(message);
}

function count(html, value) {
  return html.split(value).length - 1;
}

const pages = collectHtml(distDirectory).map((path) => ({
  path,
  html: readFileSync(path, "utf8"),
}));
const trackedPages = pages.filter(({ html }) => html.includes("https://www.googletagmanager.com/gtm.js"));

if (trackedPages.length === 0) throw new Error("No page contains the consent-managed GTM bootstrap.");

for (const { path, html } of trackedPages) {
  const consentIndex = html.indexOf('window.gtag("consent", "default"');
  const gtmIndex = html.indexOf("https://www.googletagmanager.com/gtm.js");

  if (consentIndex < 0 || consentIndex > gtmIndex) {
    throw new Error(`${path}: consent defaults must be defined before Google Tag Manager loads.`);
  }

  for (const consentType of [
    "ad_storage",
    "ad_user_data",
    "ad_personalization",
    "analytics_storage",
    "functionality_storage",
    "personalization_storage",
  ]) {
    requireText(html, `${consentType}: "denied"`, `${path}: ${consentType} must default to denied.`);
  }

  requireText(html, 'security_storage: "granted"', `${path}: security_storage must remain available.`);
  requireText(html, "googleConsentMode: true", `${path}: iubenda must manage Google Consent Mode.`);
  requireText(html, "emitGtmEvents: true", `${path}: iubenda must emit GTM consent events.`);
  requireText(html, '"iubendaSiteId":3489073', `${path}: the approved iubenda site ID is missing.`);
  requireText(html, '"iubendaPolicyId":88572891', `${path}: the approved iubenda policy ID is missing.`);

  if (count(html, "https://www.googletagmanager.com/gtm.js") !== 1) {
    throw new Error(`${path}: Google Tag Manager must be loaded exactly once.`);
  }

  if (count(html, "https://cdn.iubenda.com/cs/iubenda_cs.js") !== 1) {
    throw new Error(`${path}: iubenda must be loaded exactly once.`);
  }
}

const allHtml = pages.map(({ html }) => html).join("\n");
forbidText(allHtml, "https://www.googletagmanager.com/gtag/js", "GA4 must be controlled only through GTM.");
forbidText(allHtml, "https://www.clarity.ms/tag/", "Clarity must not load directly from the site markup.");
forbidText(allHtml, "https://connect.facebook.net/", "Meta Pixel must not load directly from the site markup.");
forbidText(allHtml, "https://cdn.brevo.com/", "Brevo must not load directly from the site markup.");
forbidText(allHtml, "https://www.googletagmanager.com/ns.html", "The consent-bypassing GTM noscript iframe is forbidden.");

console.log(`Tracking consent markup passed on ${trackedPages.length} pages.`);
