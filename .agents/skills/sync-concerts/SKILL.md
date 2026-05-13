---
name: sync-concerts
description: Walk the kpmdev setlist.fm profile and append any setlists missing from content/concerts.json. Use when the user has attended a streak of shows and wants to catch up the local data in one pass.
---

# sync-concerts

Diff the public setlist.fm profile against the local concert log and append anything new.

## When to use

The user wants to backfill multiple recently-attended concerts at once. Examples:

- "sync concerts"
- "/sync-concerts"
- "catch up on my concert log"
- "I went to a bunch of shows last weekend, can you grab them"

For a single show, prefer the `add-concert` skill — it's faster and lets the user paste a specific URL.

## What to do

1. **Run the scraper in diff mode** from the repo root:

   ```bash
   node scripts/scrape-setlist-profile.mjs --diff
   ```

   This walks the entire `https://www.setlist.fm/attended/kpmdev` listing across all pages (Wicket pagination via JSESSIONID cookie), builds a set of known `id`s from `content/concerts.json`, and only fetches individual setlist pages for entries that aren't already present. It prints `+ {date} {artist} @ {venue} ({N} songs)` per addition on stderr and ends with `Added N new setlists.` (or `Nothing to add.`).

2. **If anything was added**, run typecheck:

   ```bash
   bun run typecheck
   ```

   Failure means the JSON shape drifted. Surface the error to the user.

3. **Report back** with the count and a short list, e.g.:
   - `Added 3 concerts: The Maine (Apr 10), Nightly (Apr 10), Grayscale (Apr 10).`, or
   - `Nothing new to sync — you're caught up.`

## What NOT to do

- Don't run a full re-scrape (`node scripts/scrape-setlist-profile.mjs` with no flags) — that overwrites the file and re-fetches every page, which is slow and unnecessary unless the user explicitly asks to rebuild from scratch.
- Don't hand-edit `content/concerts.json`.
- Don't commit anything. Leave the file edit in the working tree for the user to review.
