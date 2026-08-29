# Personal Site Revamp

Last updated: 2026-08-27

## Status

- [x] Capture the initial visual direction and requirements.
- [x] Inventory the current routes, shared components, typography, icons, and theme behavior.
- [ ] Confirm the few open design decisions listed below.
- [x] Implement the shared visual foundation and application shell.
- [x] Migrate the top-level pages without redesigning their content modules yet.
- [x] Implement the compact article layout.
- [ ] Complete responsive, accessibility, and cross-theme QA.

## Goal

Revamp the site around a bold, full-width `KPM` identity while keeping the current writing, listening, reading, concerts, racing, and uses content functional. The homepage is the primary experience and stacks every section in one continuous page. Top-level routes remain available as direct links to focused views, without a persistent tab-style menu.

This first pass is primarily a shell and visual-system redesign. Deeper redesigns of the individual content modules can happen later.

## Visual direction

### Primary reference

- Rough mockup supplied with the project brief.
- [ODA — Office for Design Affairs](https://www.oda.services/) for its edge-to-edge composition, oversized wordmark, constrained reading copy, and broad page grid.
- Treat ODA as a layout reference only; do not copy its branding, content, or exact implementation.

### Core design decisions

- Use a full-width page canvas instead of the current centered `916px` bordered container.
- Make `KPM` the primary identity and home link.
- Use a standalone SVG derived from the regular-weight Speeday `KPM` glyphs for the wordmark only.
- Position the three SVG glyphs independently so their visible gaps are even, and let the hero wordmark span the full viewport width.
- Continue using Inter for body copy, navigation, controls, headings, and article content.
- Use a near-black/near-white high-contrast palette in dark mode and its inverse in light mode.
- Keep generous negative space around the hero, introduction, and page content.
- Use a narrow, readable measure for the introduction and long-form article text even though the shell spans the viewport.
- Preserve the current data-rich layouts inside each section for the first pass, adapting their colors, spacing, borders, and outer containers to the new system.

## Information architecture

### Top-level routes

| Label | Route | Initial content treatment |
| --- | --- | --- |
| Home | `/` | Large wordmark and introduction followed by every content section in one continuous page. |
| Writing | `/posts` | Retain `WritingList` for the first pass. |
| Reading | `/reading` | Retain the current `Bookshelf` layouts. |
| Listening | `/listening` | Retain `WrappedListening` and `AlbumShelf`. |
| Concerts | `/concerts` | Retain `ConcertsSection`. |
| Racing | `/racing` | Retain `Garage61`. |
| Uses | `/uses` | Retain the Base UI-backed filters and `UsesTable`. |

The homepage section flow should retain the useful content from the previous homepage and include every former menu destination:

1. Writing
2. Experience
3. Listening
4. Reading
5. Racing
6. Concerts
7. Uses

### Page behavior

- Each section is a real route with a shareable URL and normal browser history behavior.
- Do not render a segmented or tab-style section menu.
- Section headings on the homepage link to their focused routes where one exists.
- `KPM` links back to the full homepage from focused routes and article pages.

## Shared shell variants

### Homepage shell

Used by `/`.

- Large responsive `KPM` wordmark near the top of the page.
- Introduction copy below the wordmark, using the wording from the mockup unless edited later.
- All content sections stacked below the introduction.
- Shared footer at the bottom of the document.

### Focused route shell

Used by `/posts`, `/reading`, `/listening`, `/concerts`, `/racing`, `/uses`, and `/posts/$slug`.

- Smaller `KPM` wordmark in the top-left, linked back to the complete homepage.
- Article begins below the compact header.
- Preserve article title, date, reading time, RSS link, optional Substack link, table of contents, rendered Markdoc, code highlighting, and Mermaid support.
- Keep the article column narrow enough for comfortable long-form reading.
- Use the shared footer, theme tokens, focus treatment, and typography primitives.

## Reusable component plan

- [x] `Wordmark`
  - [x] Support `hero` and `compact` sizes.
  - [x] Render a standalone SVG mask with independently positioned glyph outlines.
  - [x] Scale responsively and avoid horizontal clipping at narrow widths.
  - [x] Apply a monochrome Paper dithering shader only to the full-size homepage state, with a static SVG fallback and a flat compact state.
  - [x] Link to `/` when used as site identity.
- [x] `SiteShell`
  - [x] Own the full-width canvas, global gutters, minimum page height, and footer placement.
  - [x] Support standard-section and article variants without route-specific shell duplication.
- [x] `SiteIntro`
  - [x] Hold the reusable biography copy and readable text measure.
- [x] Retire `SectionNavigation` and use homepage section headings as focused-route links.
- [x] `ThemeToggle`
  - [x] Replace the current two-button theme picker with one simple icon control.
  - [x] Continue using the existing HackerNoon pixel icons (`hn-sun` and `hn-moon`).
  - [x] Keep the current cookie-backed theme persistence and system-preference fallback.
  - [x] Expose an accessible label that describes the action, such as “Switch to light mode.”
- [ ] `ContentFrame`
  - [ ] Provide reusable `wide`, `standard`, and `article` content measures.
  - [ ] Centralize horizontal gutters and responsive behavior.
- [x] `Footer`
  - [x] Render `© 2011-2026 — Kyle McDonald` in 2026.
  - [x] Retain the current dynamic year behavior so it stays correct after 2026.
  - [x] Remove the current artificial `60vh` bottom margin and place the footer through shell layout.
- [x] `FeaturedMediaMosaic`
  - [x] Use one responsive featured-tile grid for homepage listening albums and recent concert artists.
  - [x] Use equal-size album tiles, feature only the most recent concert artist, and keep detailed listening and concert data on their focused routes.
  - [x] Show all-time full-album-equivalent plays (track scrobbles divided by the release track count) from Last.fm and artist attendance counts from Setlist.fm.
- [x] Shared charts (`DitherCharts` module)
  - [x] Replace Recharts with TanStack Charts for every data chart.
  - [x] Share the monochrome SVG gradients, chart theme, tooltip treatment, and accessibility defaults.
  - [x] Preserve the concerts timeline's independent artist/show scales and current-year treatment.
  - [x] Apply the same subtle gradient language to the listening treemap and both genre radar charts.
- [x] Homepage reading masonry
	- [x] Combine currently reading and recently finished covers beneath one Reading heading.
	- [x] Use a responsive masonry cover grid capped to three covers per column at each breakpoint.
	- [x] Keep fallback masonry gutters uniform by measuring against 1px rows without per-row gaps.
	- [x] Preserve newest-to-oldest source order visually from left to right, then top to bottom.
	- [x] Use native CSS Grid Lanes where supported and a measured CSS Grid fallback elsewhere.
	- [x] Keep the complete Reading and Finished shelves on `/reading`.

## Base UI usage

`@base-ui/react` is already installed and currently used by `UsesTable` for its input and select controls.

- [x] Remove `NavigationMenu` from the shell after retiring the segmented section menu.
- [x] Use a Base UI `Button` primitive for the icon-only theme control.
- [x] Keep the existing Base UI `Input` and `Select` usage in `UsesTable` during the visual migration.
- [ ] Do not force a Base UI primitive where a native element is more semantic or materially simpler.
- [x] Do not use Base UI Tabs for cross-route navigation; the primary experience is a continuous homepage.

## Design system work

### Typography

- [x] Convert the three Speeday glyphs into a standalone SVG wordmark without shipping the font file.
- [x] Give K, P, and M equal visual gaps in the SVG view box.
- [x] Use Speeday Regular outlines and render the standard hero wordmark edge to edge.
- [x] Keep Inter as `--font-family-sans` and reuse the current `public/fonts/inter.ttf`.
- [x] Define responsive wordmark sizes, body sizes, line heights, and letter spacing.
- [ ] Verify the SVG wordmark renders consistently in Chromium, Safari, and Firefox.
- [ ] Decide whether the generated Open Graph images should also adopt the vector wordmark.

### Layout and spacing

- [x] Remove the `--spc-text-content: 916px` constraint from the outer page shell.
- [x] Introduce page gutter tokens that scale from mobile to large desktop.
- [x] Use exact `2rem` page gutters on larger screens and `1rem` gutters on mobile.
- [x] Introduce explicit readable-measure tokens for intro copy and articles.
- [x] Define vertical rhythm for hero, intro, homepage sections, and footer.
- [x] Use one responsive vertical gap above and below the introduction.
- [x] Keep wide visual/data components capable of using the full content canvas.

### Color and borders

- [x] Refine the existing `data-appearance="light|dark"` color tokens for the black/white direction.
- [x] Define focus ring, muted text, and divider tokens.
- [ ] Check contrast in both themes, including muted metadata and linked section headings.
- [ ] Ensure current section accent colors still work against the revised backgrounds.

### Motion

- [ ] Decide whether route content should crossfade or use a View Transition after the static layout is stable.
- [x] Disable non-essential motion under `prefers-reduced-motion`.

## Implementation phases

### Phase 0 — Assets and decisions

- [x] Use a standalone SVG wordmark instead of embedding the personal-use-only font file.
- [ ] Confirm the exact biography copy.
- [x] Remove the segmented section navigation and make `/` the complete stacked homepage.
- [x] Use the compact wordmark without section navigation on focused routes and article pages.
- [ ] Confirm the desired route-transition treatment after seeing the static version.

### Phase 1 — Foundation

- [x] Add the SVG wordmark and revised typography treatment.
- [x] Revise color, spacing, width, and focus tokens.
- [x] Build `Wordmark` and the shell variants.
- [ ] Build a reusable `ContentFrame` component if route migrations show that the CSS measures are insufficient.
- [x] Replace the current centered/bordered `.page-container` layout.
- [x] Make the shell fill at least the viewport height so the footer naturally sits at the bottom on short pages.

### Phase 2 — Header, theme, and footer

- [x] Remove the slide-out and segmented navigation patterns.
- [x] Link homepage section headings to focused routes.
- [x] Implement the single-icon theme toggle using the existing icon set.
- [x] Restyle and reposition the footer.
- [ ] Add component tests for active-route logic and the theme toggle.

### Phase 3 — Top-level page migration

- [x] Update `/` to the new hero, intro, and continuous stack of all sections.
- [x] Add Uses to the homepage stack.
- [x] Move `/posts` into the standard section shell without redesigning `WritingList`.
- [x] Move `/reading` into the standard section shell without redesigning `Bookshelf`.
- [x] Move `/listening` into the standard section shell without redesigning its data views.
- [x] Move `/concerts` into the standard section shell without redesigning `ConcertsSection`.
- [x] Move `/racing` into the standard section shell without redesigning `Garage61`.
- [x] Move `/uses` into the standard section shell without redesigning `UsesTable`.
- [ ] Normalize headings, outer spacing, borders, loading/empty states, and full-width behavior across these routes.

### Phase 4 — Article migration

- [x] Add the compact article shell to `/posts/$slug`.
- [x] Replace the existing site header with the compact `KPM` wordmark on article pages.
- [x] Rework article spacing and typography while preserving rendered content features.
- [ ] Check long titles, wide code blocks, tables, images, Mermaid diagrams, and the table of contents.
- [ ] Verify writing metadata and external/RSS links remain accessible.

### Phase 5 — QA and release

- [ ] Run formatting, linting, type checking, tests, and a production build.
- [ ] Test direct loads and client navigation for every route.
- [ ] Test direct section links and returning home through the compact wordmark.
- [ ] Test dark mode, light mode, system preference, persistence, and no-flash startup.
- [ ] Test keyboard-only navigation, focus order, section-heading links, icon labels, and reduced motion.
- [ ] Test at approximately 320px, 768px, 1024px, 1440px, and an ultrawide viewport.
- [ ] Check 200% zoom and long/unexpected content.
- [ ] Check for horizontal overflow, layout shift from font loading, and clipped wordmark glyphs.
- [ ] Verify page titles, canonical URLs, RSS discovery, Open Graph images, and structured article behavior are unchanged or intentionally updated.
- [ ] Perform a visual pass in Chromium, Safari, and Firefox.

## Definition of done for the first pass

- [x] The site uses a Speeday-derived SVG for `KPM` and Inter everywhere else.
- [x] The standard shell spans the viewport and closely follows the mockup’s hierarchy and spacing.
- [x] All top-level sections remain distinct, directly loadable URLs.
- [x] The homepage presents all primary sections without a tab-style menu.
- [x] Focused routes remain directly loadable and link back through the compact wordmark.
- [x] Article pages use the compact wordmark layout.
- [ ] The existing writing, listening, reading, concerts, racing, and uses features still work.
- [x] The footer displays `© 2011-2026 — Kyle McDonald` in 2026.
- [ ] The implementation is responsive, keyboard accessible, reduced-motion aware, and free of theme flash.
- [ ] Automated checks and the production build pass.

## Later backlog (out of scope for the first pass)

- [ ] Redesign the internal layouts of Writing, Listening, Reading, Concerts, Racing, and Uses.
- [ ] Revisit the biography content and add any missing portfolio/about material.
- [ ] Create an SVG-wordmark-based Open Graph design system.
- [ ] Explore richer route transitions after measuring performance and usability.
- [ ] Audit and consolidate older section-specific CSS once the new shell has settled.

## Current implementation notes

- Routing is handled by TanStack Router/Start.
- The current root shell, site header, and footer live in `src/routes/__root.tsx`, `src/components/SiteHeader/`, and `src/components/Footer/`.
- The shared introduction is now in `src/components/SiteIntro/`; the old `HomeHero` is no longer rendered.
- Global fonts, theme colors, widths, and spacing are in `src/styles/global/`.
- Inter and Geist Mono remain self-hosted. The supplied framed KPM badge is stored locally as `public/images/kpm-wordmark-badge.svg`, with matching frame and ink-mask assets for the animated homepage treatment.
- The wordmark uses `@paper-design/shaders-react` as four independent ambient layers—letters, border, side strip, and underline—plus a fifth full-badge ripple disturbance centered beneath the pointer with a soft radial falloff. Each ambient layer has its own phase, fixed slow speed, direction, and monochrome palette, while the local ripple follows and strengthens beneath the cursor. Its radius uses container-relative units so it contracts with the sticky wordmark instead of retaining a hero-sized footprint. The underline uses a full-width simplex field so the animation reaches both ends. The animated color fades continuously into the flat theme color across the sticky-header collapse distance, then pauses once fully flat. Hover or keyboard focus restores the complete four-layer animation alongside the scaled local ripple, including after the homepage logo has collapsed and on focused routes with the permanently compact wordmark. The hero's static SVG stays hidden while shader support and canvases initialize, preventing it from flashing beneath the animated treatment; it appears only for reduced motion, unsupported WebGL, or a shader initialization timeout.
- All data charts now use `@tanstack/charts` through `src/components/DitherCharts/`; the shared SVG renderer injects restrained, theme-aware monochrome gradients instead of section accent colors.
- Theme initialization already runs before paint and persists through a `theme` cookie.
- The existing icon system is `@hackernoon/pixel-icon-library`; the current theme controls already use `hn-sun` and `hn-moon`.
- Base UI powers the Light/Dark radio group in the site menu and the existing Uses filters.
- The shared theme control appears as a segmented control at the bottom of the open site menu. The footer uses the dynamic year and restores the GitHub, X, LinkedIn, and RSS icon links from the previous navigation.

## Implementation log

### 2026-08-17 — First visual slice

- Added the large and compact SVG wordmarks with equal spacing between K, P, and M.
- Added the full-width standard shell, shared introduction, segmented route navigation, black/white theme tokens, compact article shell, and revised footer.
- Confirmed client-side navigation sets `aria-current="page"` and the Base UI active state.
- Confirmed light/dark switching updates the document appearance and accessible button label.
- Confirmed the standard shell has no page-level horizontal overflow at a 390px viewport; the section control scrolls horizontally as intended.
- Added navigation route-logic tests. The full suite passes: 21 files and 75 tests.
- Confirmed the production build completes successfully.
- Local post data was unavailable during browser QA, so the compact article header and error-state shell were verified; a populated long-form article still needs visual QA.
- Repository-wide type checking and Biome checking still report unrelated pre-existing errors outside this revamp; changed files pass targeted Biome checks.

### 2026-08-27 — Continuous homepage

- Removed the segmented route navigation and its active-pill behavior.
- Made the large wordmark and introduction exclusive to the homepage; focused routes now use the compact wordmark.
- Kept the previous stacked homepage modules and added Uses so every primary section appears on `/`.
- Confirmed 20 test files and 71 tests pass, and the production build completes successfully.

### 2026-08-27 — Fresh development data

- Enabled read-only remote Cloudflare bindings during local development so Writing and Concerts use the deployed publishing service and KV dataset.
- Added a development-only fresh-data mode that bypasses the published-content response cache, refreshes Goodreads directly from its public RSS shelves, and rebuilds the Concerts aggregate from the current raw KV payload.
- Replaced Setlist.fm HTML scraping with its official attended-setlists API. Refreshes require an uncommitted `SETLIST_FM_API_KEY`, paginate at less than two requests per second, run once daily without automatic API retries, and abort before writing KV if any page fails.
- Kept production cache behavior unchanged and prevented the development profile from writing back to remote KV.
- Confirmed the homepage renders the latest Writing posts, 53 concerts, and the current Goodreads shelf; all 20 test files (72 tests) and the production build pass.

### 2026-08-27 — Borderless page layout

- Removed the dividers between homepage sections, Writing and concert entries, article header metadata, and the footer.
- Removed the decorative rule from Experience rows while preserving the existing spacing and alignment.
- Kept the Uses table borders as the sole content dividers.

### 2026-08-27 — Recent concert artist mosaic

- Replaced the full Concerts analytics block on the homepage with a square artist-photo mosaic inspired by Last.fm's featured-artist layout.
- Featured the most recently seen artist in a larger square and filled the adjacent 3×3 grid with nine more recent unique artists.
- Kept the complete concert statistics, charts, rankings, and recent-show details on `/concerts`.
- Added cached Deezer artist-image enrichment because Last.fm's API only returns its placeholder artwork and its public artist pages reject server-side requests.
- Confirmed all ten artist images load, the featured and small tiles remain square, all 21 test files (74 tests) pass, and the production build completes.

### 2026-08-27 — Current concert artist imagery

- Switched the homepage concert mosaic to current Spotify artist-profile artwork, refreshed monthly through Spotify's public oEmbed response.
- Resolve additional Spotify profiles from Setlist.fm MusicBrainz IDs when available, with Deezer retained as a fallback.
- Kept proportional `object-fit: cover` cropping for every tile so source images are never stretched to fit the square grid.
- Confirmed all ten Spotify images load, Yellowcard's source is 640×640, every desktop grid cell remains square, all 22 test files (76 tests) pass, and the production build completes.

### 2026-08-27 — Recent racing track maps

- Replaced the homepage's recent-track bar list with a responsive grid of clean, configuration-specific SVG circuit maps from iRacing's public track-map CDN.
- Kept the detailed bar list on `/racing`, and retained recent-car and cleanest-track summaries beneath the homepage maps.
- Added a small Garage61-to-iRacing track-map catalog covering the currently recent circuits, with a graceful label when a future track has not been mapped yet.
- Vendored all 2,544 published iRacing SVG layers for 424 configurations and added `npm run tracks:sync` for future catalog refreshes.
- Switched map lookup to Garage61's iRacing platform ID, displayed each configuration name, and composited the active layout over the subdued alternate-layout layer.

### 2026-08-27 — Monochrome chart foundation

- Removed the concert orange and listening blue from every TanStack chart mark and outline.
- Centralized the theme-aware chart rendering, tooltip, and accessibility behavior in the shared TanStack chart module.
- Kept separate densities for stacked series, current-year data, radar fills, and treemap cells so the charts remain legible without color.
- Switched the listening waveform and listening/racing metric bars to the same neutral foreground palette so no data visualization relies on a section accent color.

### 2026-08-28 — Navigation and social controls

- Moved the light/dark control from the footer to the bottom of the open top-right menu as a square-edged Base UI segmented radio group with a sliding CSS selection layer, retaining cookie persistence and the HackerNoon sun/moon icons.
- Restored the previous GitHub, X, LinkedIn, and RSS destinations as accessible 44px icon links in the footer.
- Confirmed the open menu and footer visually, verified both theme transitions, passed targeted Biome checks and all 94 tests, and completed a production build.

### 2026-08-28 — Concert history chart fidelity

- Rebuilt Shows per year as a smooth TanStack chart with clearly differentiated gradient layers for first-time and returning artists, plus a single interactive show-count line, a compact legend, square geometry, readable exterior axes, and sufficient vertical headroom.
- Restored the per-year Shows, New artists, and Returning artists breakdown in the pointer and keyboard tooltip.
- Verified the chart visually in dark and light themes, confirmed keyboard tooltip access, passed all 94 tests, and completed a production build.

### 2026-08-28 — Subtle gradient chart style

- Retired the ordered-pixel/dither fills across the concert timeline, genre radar charts, and listening treemap.
- Added a shared monochrome gradient renderer, a smooth latest-value marker on the concert timeline, quiet dotted guides, and square treemap cells.
- Kept the concert chart's new-versus-returning artist layers and all chart tooltips intact while reducing visual noise in both themes.

### 2026-08-28 — Monochrome wordmark shader

- Split the KPM badge into four independently animated shader masks: lettering, border, side strip, and underline. The accent strips retain their separate gray tones and use different dither movement from the lettering.
- Added smoothed pointer parallax with a different movement multiplier per shader layer, while keeping the palette monochrome in both themes. Idle animation runs slowly and eases up to a faster rate on hover or keyboard focus.
- Replaced the mismatched lazy-loading SVG flash with a stable four-mask fallback that crossfades only after every canvas is ready. The WebGL treatment still fades continuously to a flat palette as the sticky header collapses and pauses once fully flat.
- Added a fifth, locally revealed ripple field across the complete badge so pointer movement briefly strengthens the disturbance beneath the cursor before it settles, with a soft radial falloff into the ambient layers.
- Removed the hero's initial static-SVG paint so the dither treatment appears as one clean layer once all five canvases are ready; the SVG is now reserved for genuine fallback cases.
- Removed the earlier whole-logo pointer parallax, hover acceleration, and hover reveal so the four ambient shader layers stay fixed while only the localized ripple reacts to the cursor; softened the ripple edge with a longer multi-stop opacity falloff.
- Made the localized ripple radius container-relative so it scales from the full-width hero treatment down to a compact 2–2.5rem disturbance in the sticky header.
