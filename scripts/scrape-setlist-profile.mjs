#!/usr/bin/env node
// Scraper for setlist.fm public profile data.
//
// The Setlist.fm API key application is rejected indefinitely, so we own the
// data: scrape the public profile and bundle the result as content/concerts.json.
// This file is the single source of truth for both the one-time full re-scrape
// AND the two skills (.claude/skills/add-concert and .claude/skills/sync-concerts).
//
// Modes (CLI):
//   node scripts/scrape-setlist-profile.mjs               # full re-scrape (overwrites file)
//   node scripts/scrape-setlist-profile.mjs --diff        # only fetch setlists missing from file
//   node scripts/scrape-setlist-profile.mjs --url <URL>   # fetch one setlist and upsert by id
//
// Importable helpers (used by the skills):
//   parseSetlistPage(html, url) → entry | null
//   collectAllSetlistLinks(user) → string[]
//   readConcerts() / writeConcerts(entries) → JSON file IO + sort

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const CONCERTS_JSON = join(REPO_ROOT, "content", "concerts.json");

export const SETLIST_FM_USER = "kpmdev";
const UA =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const REQUEST_DELAY_MS = 350;
const MAX_PAGES = 25; // safety cap on pagination

const MONTHS = {
	Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
	Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let cookieJar = "";

const fetchHtml = async (url, opts = {}) => {
	const res = await fetch(url, {
		headers: {
			"User-Agent": UA,
			...(cookieJar ? { Cookie: cookieJar } : {}),
			...(opts.referer ? { Referer: opts.referer } : {}),
		},
		redirect: "follow",
	});
	const setCookie = res.headers.get("set-cookie");
	if (setCookie) {
		const match = setCookie.match(/JSESSIONID=[^;]+/);
		if (match) cookieJar = match[0];
	}
	if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
	return res.text();
};

const decode = (s) =>
	s
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&nbsp;/g, " ");

const extractSetlistLinks = (html) => {
	const links = new Set();
	const r1 = /href="\.\.\/setlist\/([^"]+\.html)"/g;
	const r2 = /href="setlist\/([^"]+\.html)"/g;
	let m;
	while ((m = r1.exec(html)) !== null) {
		links.add(`https://www.setlist.fm/setlist/${m[1]}`);
	}
	while ((m = r2.exec(html)) !== null) {
		links.add(`https://www.setlist.fm/setlist/${m[1]}`);
	}
	return [...links];
};

// Wicket pager only exposes a sliding window of page links around the current
// page (plus a "next" link). To reach all pages, also follow the "next" arrow
// when present, and re-extract page links from every page so we discover ones
// that weren't visible from page 1.
const extractPageNavLinks = (html) => {
	const r =
		/href="(?:\.\.\/)?\?(wicket:interface=:[^"]+:navigation:\d+:pageLink::ILinkListener::)"/g;
	const seen = new Set();
	let m;
	while ((m = r.exec(html)) !== null) {
		seen.add(m[1].replace(/&amp;/g, "&"));
	}
	return [...seen];
};

const extractNextLink = (html) => {
	const m = html.match(
		/href="(?:\.\.\/)?\?(wicket:interface=:[^"]+:next::ILinkListener::)"/,
	);
	return m ? m[1].replace(/&amp;/g, "&") : null;
};

export const collectAllSetlistLinks = async (user = SETLIST_FM_USER) => {
	const indexUrl = `https://www.setlist.fm/attended/${user}`;
	const firstHtml = await fetchHtml(indexUrl);
	const all = new Set(extractSetlistLinks(firstHtml));

	const visitedQueries = new Set();
	const queue = [...new Set(extractPageNavLinks(firstHtml))];
	const nextFromFirst = extractNextLink(firstHtml);
	if (nextFromFirst) queue.push(nextFromFirst);

	let pageIndex = 1;
	while (queue.length > 0 && pageIndex < MAX_PAGES) {
		const q = queue.shift();
		if (visitedQueries.has(q)) continue;
		visitedQueries.add(q);
		pageIndex += 1;

		const url = `https://www.setlist.fm/?${q}`;
		const before = all.size;
		try {
			const html = await fetchHtml(url, { referer: indexUrl });
			for (const link of extractSetlistLinks(html)) all.add(link);
			console.error(
				`  page ${pageIndex}: +${all.size - before} (total ${all.size})`,
			);

			// Discover page links not visible from earlier pages.
			for (const newQ of extractPageNavLinks(html)) {
				if (!visitedQueries.has(newQ) && !queue.includes(newQ)) queue.push(newQ);
			}
			// Always follow "next" while it exists — guarantees we walk to the end
			// even if the numeric page list never reveals later pages.
			const nextQ = extractNextLink(html);
			if (nextQ && !visitedQueries.has(nextQ) && !queue.includes(nextQ)) {
				queue.push(nextQ);
			}
		} catch (err) {
			console.error(`  page ${pageIndex}: ERROR ${err.message}`);
		}
		await sleep(REQUEST_DELAY_MS);
	}

	return [...all];
};

const slugFromUrl = (url) => {
	const m = url.match(/\/setlist\/[^/]+\/\d+\/([^"/]+)\.html/);
	if (m) return m[1];
	return url.split("/").pop().replace(/\.html$/, "");
};

export const parseSetlistPage = (html, url) => {
	const monthMatch = html.match(/<span class="month">([^<]+)<\/span>/);
	const dayMatch = html.match(/<span class="day">([^<]+)<\/span>/);
	const yearMatch = html.match(/<span class="year">([^<]+)<\/span>/);
	if (!monthMatch || !dayMatch || !yearMatch) return null;
	const month = MONTHS[monthMatch[1].trim()];
	const day = Number.parseInt(dayMatch[1].trim(), 10);
	const year = Number.parseInt(yearMatch[1].trim(), 10);
	if (!month || !day || !year) return null;
	const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

	const ogTitleMatch = html.match(
		/<meta property="og:title" content="([^"]+) Setlist at [^"]+"/,
	);
	const artist = ogTitleMatch ? decode(ogTitleMatch[1]).trim() : "";
	if (!artist) return null;

	let venue = "";
	let cityRaw = "";
	const venueHeaderMatch = html.match(
		/<div class="venueHeader">[\s\S]*?<h2>([^<]+)<\/h2>[\s\S]*?<span><span>([^<]+)<\/span>/,
	);
	if (venueHeaderMatch) {
		venue = decode(venueHeaderMatch[1]).trim();
		cityRaw = decode(venueHeaderMatch[2]).trim();
	} else {
		const inlineVenueMatch = html.match(
			/<div class="setlistHeadline">[\s\S]*?<span>at <a[^>]*title="More setlists from ([^"]+)"/,
		);
		if (inlineVenueMatch) {
			const full = decode(inlineVenueMatch[1]).trim();
			const parts = full.split(",").map((p) => p.trim());
			venue = parts[0] ?? "";
			cityRaw = parts.slice(1).join(", ");
		}
	}
	const cityParts = cityRaw
		.split(",")
		.map((p) => p.trim())
		.filter(Boolean);
	const city = cityParts.slice(0, Math.min(2, cityParts.length)).join(", ");

	const tourMatch = html.match(
		/<span>Tour:<\/span>\s*<span><a[^>]*><span>([^<]+)<\/span>/,
	);
	const tour = tourMatch ? decode(tourMatch[1]).trim() : null;

	const songs = [];
	const songRegex =
		/<li class="setlistParts song">([\s\S]*?)(?=<li class="setlistParts|<\/ol>)/g;
	let songMatch;
	while ((songMatch = songRegex.exec(html)) !== null) {
		const songBlock = songMatch[1];
		const labelMatch = songBlock.match(
			/<a class="songLabel"[^>]*title="Statistics for ([^"]+) performed by [^"]+"/,
		);
		const fallbackLabel = songBlock.match(
			/<a class="songLabel"[^>]*>([^<]+)</,
		);
		const songName = labelMatch
			? decode(labelMatch[1]).trim()
			: fallbackLabel
				? decode(fallbackLabel[1]).trim()
				: "";
		if (!songName) continue;
		const coverMatch = songBlock.match(
			/<a[^>]+title="More songs[^"]*by ([^"]+)"[^>]*>[^<]+<\/a>\s*cover/i,
		);
		const cover = coverMatch ? decode(coverMatch[1]).trim() : null;
		songs.push(cover ? { name: songName, cover } : songName);
	}

	const entry = {
		id: slugFromUrl(url),
		date,
		artist,
		venue,
		city,
		url,
		songs,
	};
	if (tour) entry.tour = tour;
	return entry;
};

export const fetchSetlistEntry = async (url) => {
	const html = await fetchHtml(url);
	return parseSetlistPage(html, url);
};

export const readConcerts = async () => {
	if (!existsSync(CONCERTS_JSON)) return { concerts: [] };
	const raw = await readFile(CONCERTS_JSON, "utf8");
	return JSON.parse(raw);
};

const sortAndStringify = (concerts) => {
	const sorted = [...concerts].sort((a, b) => b.date.localeCompare(a.date));
	return `${JSON.stringify({ concerts: sorted }, null, 2)}\n`;
};

export const writeConcerts = async (concerts) => {
	await writeFile(CONCERTS_JSON, sortAndStringify(concerts), "utf8");
};

export const upsertConcert = async (entry) => {
	const data = await readConcerts();
	const filtered = data.concerts.filter((c) => c.id !== entry.id);
	const wasReplacement = filtered.length !== data.concerts.length;
	filtered.push(entry);
	await writeConcerts(filtered);
	return { wasReplacement };
};

const runFullScrape = async () => {
	const links = await collectAllSetlistLinks();
	console.error(`Found ${links.length} setlists; fetching each…`);
	const entries = [];
	for (let i = 0; i < links.length; i += 1) {
		const url = links[i];
		try {
			const entry = await fetchSetlistEntry(url);
			if (entry) {
				entries.push(entry);
				if ((i + 1) % 10 === 0 || i === links.length - 1) {
					console.error(`  fetched ${i + 1}/${links.length}`);
				}
			} else {
				console.error(`  [${i + 1}/${links.length}] FAILED to parse ${url}`);
			}
		} catch (err) {
			console.error(`  [${i + 1}/${links.length}] ERROR: ${err.message}`);
		}
		await sleep(REQUEST_DELAY_MS);
	}
	await writeConcerts(entries);
	console.error(`\nWrote ${CONCERTS_JSON} (${entries.length} setlists)`);
};

const runDiffScrape = async () => {
	const data = await readConcerts();
	const known = new Set(data.concerts.map((c) => c.id));
	console.error(`Existing: ${known.size} setlists`);
	const links = await collectAllSetlistLinks();
	const newLinks = links.filter((url) => !known.has(slugFromUrl(url)));
	console.error(`Found ${links.length} on profile, ${newLinks.length} new`);
	if (newLinks.length === 0) {
		console.error("Nothing to add.");
		return;
	}
	const fresh = [];
	for (let i = 0; i < newLinks.length; i += 1) {
		const url = newLinks[i];
		try {
			const entry = await fetchSetlistEntry(url);
			if (entry) {
				fresh.push(entry);
				console.error(
					`  + ${entry.date} ${entry.artist} @ ${entry.venue} (${entry.songs.length} songs)`,
				);
			}
		} catch (err) {
			console.error(`  ERROR: ${err.message}`);
		}
		await sleep(REQUEST_DELAY_MS);
	}
	await writeConcerts([...data.concerts, ...fresh]);
	console.error(`\nAdded ${fresh.length} new setlists.`);
};

const runUrlScrape = async (url) => {
	const entry = await fetchSetlistEntry(url);
	if (!entry) {
		console.error(`Failed to parse ${url}`);
		process.exit(1);
	}
	const { wasReplacement } = await upsertConcert(entry);
	console.error(
		`${wasReplacement ? "Replaced" : "Added"}: ${entry.date} ${entry.artist} @ ${entry.venue} (${entry.songs.length} songs)`,
	);
};

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
	const args = process.argv.slice(2);
	const urlIdx = args.indexOf("--url");
	const url = urlIdx >= 0 ? args[urlIdx + 1] : null;
	const isDiff = args.includes("--diff");

	const main = url
		? () => runUrlScrape(url)
		: isDiff
			? runDiffScrape
			: runFullScrape;
	main().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}
