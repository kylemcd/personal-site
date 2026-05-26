import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { useMemo, useState } from "react";
import { z } from "zod";

import { ErrorComponent } from "@/components/ErrorComponent";
import { Text } from "@/components/Text";
import { env } from "@/lib/env";
import { buildMeta } from "@/lib/meta";

import "@/styles/routes/calendar.css";

const GENRE_ADMIN_AUTH_COOKIE = "genre-admin-auth";

type GenreSuggestionStatus = "pending" | "accepted" | "rejected" | "dismissed";

type ObservedEntry = {
  rawTag: string;
  normalizedTag: string;
  count: number;
  firstSeenIso: string;
  lastSeenIso: string;
  sources: string[];
  currentCanonical: string;
};

type SuggestionEntry = {
  rawTag: string;
  normalizedTag: string;
  suggestedCanonical: string;
  confidence: "high" | "medium" | "low";
  reason: string;
  firstSuggestedIso: string;
  lastSuggestedIso: string;
  count: number;
};

const getExpectedAuth = (): string => env.CALENDAR_AUTH || "";

const isAuthCookieValid = (): boolean => {
  const expected = getExpectedAuth();
  if (!expected) return true;
  return getCookie(GENRE_ADMIN_AUTH_COOKIE) === expected;
};

const normalizeRawTag = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[./_,]+/g, " ")
    .replace(/[-]+/g, " ")
    .replace(/[()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type LoaderData =
  | { authRequired: true; data?: undefined }
  | {
      authRequired: false;
      data: {
        aliases: Record<string, string>;
        observed: Record<string, ObservedEntry>;
        suggestions: Record<string, SuggestionEntry>;
        reviewState: Record<string, GenreSuggestionStatus>;
      };
    };

const getData = createServerFn({ method: "GET" }).handler(async (): Promise<LoaderData> => {
  if (!isAuthCookieValid()) return { authRequired: true };
  const { taxonomyAdmin } = await import("@/lib/lastfm/genre-taxonomy");
  const [observed, suggestions, reviewState, aliases] = await Promise.all([
    taxonomyAdmin.listObserved(),
    taxonomyAdmin.listSuggestions(),
    taxonomyAdmin.listReviewState(),
    taxonomyAdmin.loadAliasMap(),
  ]);
  return {
    authRequired: false,
    data: { aliases, observed, suggestions, reviewState },
  };
});

const signInToGenreAdmin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ password: z.string() }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const expected = getExpectedAuth();
    if (!expected) return { ok: true };
    if (data.password !== expected) return { ok: false };
    setCookie(GENRE_ADMIN_AUTH_COOKIE, expected, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return { ok: true };
  });

const setAlias = createServerFn({ method: "POST" })
  .inputValidator(z.object({ rawTag: z.string(), canonicalGenre: z.string() }))
  .handler(async ({ data }) => {
    if (!isAuthCookieValid()) return { ok: false };
    const { taxonomyAdmin } = await import("@/lib/lastfm/genre-taxonomy");
    await taxonomyAdmin.setAlias(data.rawTag, data.canonicalGenre);
    return { ok: true };
  });

const removeAlias = createServerFn({ method: "POST" })
  .inputValidator(z.object({ rawTag: z.string() }))
  .handler(async ({ data }) => {
    if (!isAuthCookieValid()) return { ok: false };
    const { taxonomyAdmin } = await import("@/lib/lastfm/genre-taxonomy");
    await taxonomyAdmin.removeAlias(data.rawTag);
    return { ok: true };
  });

const setSuggestionStatus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      rawTag: z.string(),
      status: z.enum(["pending", "accepted", "rejected", "dismissed"]),
    }),
  )
  .handler(async ({ data }) => {
    if (!isAuthCookieValid()) return { ok: false };
    const { taxonomyAdmin } = await import("@/lib/lastfm/genre-taxonomy");
    await taxonomyAdmin.setSuggestionStatus(data.rawTag, data.status);
    return { ok: true };
  });

const promoteSuggestion = createServerFn({ method: "POST" })
  .inputValidator(z.object({ rawTag: z.string(), canonicalGenre: z.string().optional() }))
  .handler(async ({ data }) => {
    if (!isAuthCookieValid()) return { ok: false };
    const { taxonomyAdmin } = await import("@/lib/lastfm/genre-taxonomy");
    await taxonomyAdmin.promoteSuggestion(data.rawTag, data.canonicalGenre);
    return { ok: true };
  });

export const Route = createFileRoute("/admin/genres")({
  component: GenreAdminRoute,
  loader: () => getData(),
  errorComponent: ErrorComponent,
  head: () => ({
    meta: buildMeta({
      title: "Genre Admin - Kyle McDonald",
      url: "https://kylemcd.com/admin/genres",
    }),
  }),
});

function GenreAdminRoute() {
  const loaderData = Route.useLoaderData() as LoaderData;
  if (loaderData.authRequired) return <GenreAdminAuthGate />;
  return <GenreAdminDashboard {...loaderData.data} />;
}

function GenreAdminAuthGate() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await signInToGenreAdmin({ data: { password } });
      if (res.ok) await router.invalidate();
      else setError("Wrong password.");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="section-container calendar-page-section">
      <form className="calendar-auth-form" onSubmit={onSubmit}>
        <Text as="label" size="1" color="2" htmlFor="genre-admin-password">
          This page is private. Enter the password to continue.
        </Text>
        <div className="calendar-auth-form-row">
          <input
            id="genre-admin-password"
            className="calendar-auth-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            required
          />
          <button
            type="submit"
            className="calendar-auth-submit"
            disabled={submitting || password.length === 0}
          >
            {submitting ? "Checking…" : "Continue"}
          </button>
        </div>
        {error ? (
          <Text as="p" size="0" color="2" className="calendar-auth-error">
            {error}
          </Text>
        ) : null}
      </form>
    </div>
  );
}

function GenreAdminDashboard(props: {
  aliases: Record<string, string>;
  observed: Record<string, ObservedEntry>;
  suggestions: Record<string, SuggestionEntry>;
  reviewState: Record<string, GenreSuggestionStatus>;
}) {
  const router = useRouter();
  const [rawTag, setRawTag] = useState("");
  const [canonicalGenre, setCanonicalGenre] = useState("");
  const [filter, setFilter] = useState<"all" | "unmapped" | "low-confidence" | "recent">("all");

  const aliasesEntries = useMemo(
    () => Object.entries(props.aliases).sort((a, b) => a[0].localeCompare(b[0])),
    [props.aliases],
  );
  const observedEntries = useMemo(
    () => Object.values(props.observed).sort((a, b) => b.count - a.count),
    [props.observed],
  );
  const suggestionEntries = useMemo(() => {
    const base = Object.values(props.suggestions).sort((a, b) => b.count - a.count);
    if (filter === "unmapped") return base.filter((s) => !props.aliases[s.normalizedTag]);
    if (filter === "low-confidence") return base.filter((s) => s.confidence === "low");
    if (filter === "recent") {
      const cutoffMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return base.filter((s) => Date.parse(s.lastSuggestedIso) >= cutoffMs);
    }
    return base;
  }, [props.suggestions, props.aliases, filter]);

  const onSetAlias = async (event: React.FormEvent) => {
    event.preventDefault();
    await setAlias({ data: { rawTag, canonicalGenre } });
    setRawTag("");
    setCanonicalGenre("");
    await router.invalidate();
  };

  const runAndRefresh = async (callback: () => Promise<unknown>) => {
    await callback();
    await router.invalidate();
  };

  return (
    <div className="section-container calendar-page-section">
      <Text as="h2" size="3">Genre Admin</Text>
      <Text as="p" size="1" color="2">
        Manage alias mappings and review auto-suggested genre buckets.
      </Text>

      <form className="calendar-auth-form" onSubmit={onSetAlias}>
        <Text as="label" size="1" color="2">Set alias</Text>
        <div className="calendar-auth-form-row">
          <input
            className="calendar-auth-input"
            placeholder="raw tag (e.g. power(pop))"
            value={rawTag}
            onChange={(e) => setRawTag(e.target.value)}
            required
          />
          <input
            className="calendar-auth-input"
            placeholder="canonical genre (e.g. pop punk)"
            value={canonicalGenre}
            onChange={(e) => setCanonicalGenre(e.target.value)}
            required
          />
          <button className="calendar-auth-submit" type="submit">Save</button>
        </div>
      </form>

      <div style={{ display: "flex", gap: 8, marginTop: 16, marginBottom: 8 }}>
        {(["all", "unmapped", "low-confidence", "recent"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className="calendar-auth-submit"
            onClick={() => setFilter(item)}
            disabled={filter === item}
          >
            {item}
          </button>
        ))}
      </div>

      <Text as="h3" size="2">Suggestions ({suggestionEntries.length})</Text>
      <ul>
        {suggestionEntries.slice(0, 200).map((suggestion) => {
          const status = props.reviewState[normalizeRawTag(suggestion.rawTag)] ?? "pending";
          return (
            <li key={suggestion.normalizedTag}>
              <Text as="p" size="1">
                {suggestion.rawTag} {"->"} {suggestion.suggestedCanonical} ({suggestion.confidence})
              </Text>
              <Text as="p" size="0" color="2">
                {suggestion.reason} | count {suggestion.count} | status {status}
              </Text>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button
                  type="button"
                  className="calendar-auth-submit"
                  onClick={() => runAndRefresh(() => promoteSuggestion({ data: { rawTag: suggestion.rawTag } }))}
                >
                  Promote
                </button>
                {(["pending", "accepted", "rejected", "dismissed"] as GenreSuggestionStatus[]).map((nextStatus) => (
                  <button
                    key={nextStatus}
                    type="button"
                    className="calendar-auth-submit"
                    onClick={() =>
                      runAndRefresh(() =>
                        setSuggestionStatus({ data: { rawTag: suggestion.rawTag, status: nextStatus } }),
                      )
                    }
                  >
                    {nextStatus}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <Text as="h3" size="2">Observed tags ({observedEntries.length})</Text>
      <ul>
        {observedEntries.slice(0, 200).map((entry) => (
          <li key={entry.normalizedTag}>
            <Text as="p" size="1">
              {entry.rawTag} {"=>"} {entry.currentCanonical} (count {entry.count})
            </Text>
            <Text as="p" size="0" color="2">
              last seen {entry.lastSeenIso} | sources {entry.sources.join(", ")}
            </Text>
          </li>
        ))}
      </ul>

      <Text as="h3" size="2">Aliases ({aliasesEntries.length})</Text>
      <ul>
        {aliasesEntries.map(([raw, canonical]) => (
          <li key={raw}>
            <Text as="p" size="1">
              {raw} {"=>"} {canonical}
            </Text>
            <button
              type="button"
              className="calendar-auth-submit"
              onClick={() => runAndRefresh(() => removeAlias({ data: { rawTag: raw } }))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
