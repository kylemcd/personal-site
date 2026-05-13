---
name: add-concert
description: Append a single setlist.fm setlist to content/concerts.json given its URL. Use when the user wants to record a concert they just attended.
---

# add-concert

Add a single setlist.fm setlist to the local concert log at `content/concerts.json`.

## When to use

The user gives you a setlist.fm URL and wants it added to the bundled concert data. Examples:

- "add this concert: https://www.setlist.fm/setlist/..."
- "/add-concert https://..."
- "I went to this last night, log it"

For a multi-band show, the user has to give you each band's setlist URL separately (one entry per artist). The grouping into "one show with N artists" happens automatically in the app code based on matching date+venue.

## What to do

1. **Validate the URL.** It must match `https://www.setlist.fm/setlist/...html`. If not, ask the user for the correct URL.

2. **Run the scraper in URL mode** from the repo root:

   ```bash
   node scripts/scrape-setlist-profile.mjs --url <THE_URL>
   ```

   This fetches the page, parses date / artist / venue / city / tour / songs (with cover detection), and upserts into `content/concerts.json`. Upsert means: if an entry with the same `id` already exists, it's replaced; otherwise it's appended. The file is sorted by date desc on every write.

3. **Verify with typecheck:**

   ```bash
   bun run typecheck
   ```

   Failure here usually means the JSON shape drifted — the scraper enforces the same shape that `src/lib/setlistfm/concerts-data.ts` validates with Zod.

4. **Report back to the user** with one line:
   - `Added: 2026-04-10 The Maine @ The Salt Shed (22 songs)`, or
   - `Replaced: 2026-04-10 The Maine @ The Salt Shed (22 songs)` if an existing entry was updated.

   The scraper prints exactly that on stderr — just relay it.

## What NOT to do

- Don't hand-edit `content/concerts.json` to add an entry — always go through the scraper so the shape stays consistent.
- Don't commit anything. Leave the file edit in the working tree for the user to review and commit themselves.
- Don't run the dev server or restart anything; the JSON is bundled at build time but Vite picks it up on the next request.
