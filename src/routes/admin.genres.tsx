import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { Result } from "better-result";
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

type ArtistEntry = {
  artistKey: string;
  artistName: string;
  genre: string;
  count: number;
  firstSeenIso: string;
  lastSeenIso: string;
  sources: string[];
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
        observedArtists: Record<string, ArtistEntry>;
        artistOverrides: Record<string, string>;
      };
    };

const getData = createServerFn({ method: "GET" }).handler(
  async (): Promise<LoaderData> => {
    if (!isAuthCookieValid()) return { authRequired: true };
    const { taxonomyAdmin } = await import("@/lib/lastfm/genre-taxonomy");
    const [snapshot, reviewState, aliases, artistOverrides] = await Promise.all(
      [
        taxonomyAdmin.getObservationSnapshot(),
        taxonomyAdmin.listReviewState(),
        taxonomyAdmin.loadAliasMap(),
        taxonomyAdmin.loadArtistGenreOverrides(),
      ],
    );
    return {
      authRequired: false,
      data: {
        aliases,
        observed: snapshot.observed,
        suggestions: snapshot.suggestions,
        reviewState,
        observedArtists: snapshot.artists,
        artistOverrides,
      },
    };
  },
);

const signInToGenreAdmin = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string() }))
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
  .validator(z.object({ rawTag: z.string(), canonicalGenre: z.string() }))
  .handler(async ({ data }) => {
    if (!isAuthCookieValid()) return { ok: false };
    const { taxonomyAdmin } = await import("@/lib/lastfm/genre-taxonomy");
    const result = await taxonomyAdmin.setAlias(
      data.rawTag,
      data.canonicalGenre,
    );
    if (Result.isError(result)) throw result.error;
    return { ok: true };
  });

const removeAlias = createServerFn({ method: "POST" })
  .validator(z.object({ rawTag: z.string() }))
  .handler(async ({ data }) => {
    if (!isAuthCookieValid()) return { ok: false };
    const { taxonomyAdmin } = await import("@/lib/lastfm/genre-taxonomy");
    const result = await taxonomyAdmin.removeAlias(data.rawTag);
    if (Result.isError(result)) throw result.error;
    return { ok: true };
  });

const setSuggestionStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      rawTag: z.string(),
      status: z.enum(["pending", "accepted", "rejected", "dismissed"]),
    }),
  )
  .handler(async ({ data }) => {
    if (!isAuthCookieValid()) return { ok: false };
    const { taxonomyAdmin } = await import("@/lib/lastfm/genre-taxonomy");
    const result = await taxonomyAdmin.setSuggestionStatus(
      data.rawTag,
      data.status,
    );
    if (Result.isError(result)) throw result.error;
    return { ok: true };
  });

const promoteSuggestion = createServerFn({ method: "POST" })
  .validator(
    z.object({ rawTag: z.string(), canonicalGenre: z.string().optional() }),
  )
  .handler(async ({ data }) => {
    if (!isAuthCookieValid()) return { ok: false };
    const { taxonomyAdmin } = await import("@/lib/lastfm/genre-taxonomy");
    const result = await taxonomyAdmin.promoteSuggestion(
      data.rawTag,
      data.canonicalGenre,
    );
    if (Result.isError(result)) throw result.error;
    return { ok: true };
  });

const setArtistOverride = createServerFn({ method: "POST" })
  .validator(z.object({ artistKey: z.string(), canonicalGenre: z.string() }))
  .handler(async ({ data }) => {
    if (!isAuthCookieValid()) return { ok: false };
    const { taxonomyAdmin } = await import("@/lib/lastfm/genre-taxonomy");
    const result = await taxonomyAdmin.setArtistOverride(
      data.artistKey,
      data.canonicalGenre,
    );
    if (Result.isError(result)) throw result.error;
    return { ok: true };
  });

const removeArtistOverride = createServerFn({ method: "POST" })
  .validator(z.object({ artistKey: z.string() }))
  .handler(async ({ data }) => {
    if (!isAuthCookieValid()) return { ok: false };
    const { taxonomyAdmin } = await import("@/lib/lastfm/genre-taxonomy");
    const result = await taxonomyAdmin.removeArtistOverride(data.artistKey);
    if (Result.isError(result)) throw result.error;
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
  observedArtists: Record<string, ArtistEntry>;
  artistOverrides: Record<string, string>;
}) {
  const router = useRouter();
  const [rawTag, setRawTag] = useState("");
  const [canonicalGenre, setCanonicalGenre] = useState("");
  const [activeTab, setActiveTab] = useState<"tags" | "artists">("tags");
  const [artistGenreDrafts, setArtistGenreDrafts] = useState<
    Record<string, string>
  >({});

  const aliasesEntries = useMemo(
    () =>
      Object.entries(props.aliases).sort((a, b) => a[0].localeCompare(b[0])),
    [props.aliases],
  );
  const observedArtistEntries = useMemo(
    () =>
      Object.values(props.observedArtists).sort((a, b) => {
        const lastSeenDiff =
          new Date(b.lastSeenIso).getTime() - new Date(a.lastSeenIso).getTime();
        if (lastSeenDiff !== 0) return lastSeenDiff;
        if (b.count !== a.count) return b.count - a.count;
        return a.artistName.localeCompare(b.artistName);
      }),
    [props.observedArtists],
  );
  const suggestionEntries = useMemo(() => {
    return Object.values(props.suggestions)
      .filter((suggestion) => {
        const status =
          props.reviewState[normalizeRawTag(suggestion.rawTag)] ?? "pending";
        return status === "pending";
      })
      .sort((a, b) => b.count - a.count);
  }, [props.suggestions, props.reviewState]);

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

  const onSetArtistOverride = async (artistKey: string) => {
    const value = artistGenreDrafts[artistKey]?.trim();
    if (!value) return;
    await runAndRefresh(() =>
      setArtistOverride({ data: { artistKey, canonicalGenre: value } }),
    );
  };

  const onAcceptSuggestion = async (suggestion: SuggestionEntry) => {
    if (
      normalizeRawTag(suggestion.rawTag) !==
      normalizeRawTag(suggestion.suggestedCanonical)
    ) {
      await runAndRefresh(() =>
        promoteSuggestion({
          data: {
            rawTag: suggestion.rawTag,
            canonicalGenre: suggestion.suggestedCanonical,
          },
        }),
      );
      return;
    }
    await runAndRefresh(() =>
      setSuggestionStatus({
        data: { rawTag: suggestion.rawTag, status: "accepted" },
      }),
    );
  };

  const onRejectSuggestion = async (suggestion: SuggestionEntry) => {
    await runAndRefresh(() =>
      setSuggestionStatus({
        data: { rawTag: suggestion.rawTag, status: "rejected" },
      }),
    );
  };

  return (
    <div className="section-container calendar-page-section">
      <Text as="h2" size="3">
        Genre Admin
      </Text>
      <Text as="p" size="1" color="2">
        Manage alias mappings and review auto-suggested genre buckets.
      </Text>

      <div style={{ display: "flex", gap: 8, marginTop: 16, marginBottom: 8 }}>
        {(["tags", "artists"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className="calendar-auth-submit"
            onClick={() => setActiveTab(tab)}
            disabled={activeTab === tab}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "tags" ? (
        <>
          <form className="calendar-auth-form" onSubmit={onSetAlias}>
            <Text as="label" size="1" color="2">
              Set alias
            </Text>
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
              <button className="calendar-auth-submit" type="submit">
                Save
              </button>
            </div>
          </form>

          <Text as="h3" size="2">
            Suggestions ({suggestionEntries.length})
          </Text>
          <ul>
            {suggestionEntries.slice(0, 200).map((suggestion) => {
              return (
                <li key={suggestion.normalizedTag}>
                  <Text as="p" size="1">
                    {suggestion.rawTag} {"->"} {suggestion.suggestedCanonical} (
                    {suggestion.confidence})
                  </Text>
                  <Text as="p" size="0" color="2">
                    {suggestion.reason} | count {suggestion.count}
                  </Text>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <button
                      type="button"
                      className="calendar-auth-submit"
                      onClick={() => onAcceptSuggestion(suggestion)}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="calendar-auth-submit"
                      onClick={() => onRejectSuggestion(suggestion)}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <Text as="h3" size="2">
            Aliases ({aliasesEntries.length})
          </Text>
          <ul>
            {aliasesEntries.map(([raw, canonical]) => (
              <li key={raw}>
                <Text as="p" size="1">
                  {raw} {"=>"} {canonical}
                </Text>
                <button
                  type="button"
                  className="calendar-auth-submit"
                  onClick={() =>
                    runAndRefresh(() => removeAlias({ data: { rawTag: raw } }))
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <Text as="h3" size="2">
            Artists ({observedArtistEntries.length})
          </Text>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 4px" }}>
                    Artist
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 4px" }}>
                    Current Genre
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 4px" }}>
                    Status
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 4px" }}>
                    Count
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 4px" }}>
                    Last Seen
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 4px" }}>
                    Override
                  </th>
                </tr>
              </thead>
              <tbody>
                {observedArtistEntries.slice(0, 300).map((artist) => {
                  const override =
                    props.artistOverrides[artist.artistKey] ?? "";
                  return (
                    <tr key={artist.artistKey}>
                      <td style={{ padding: "8px 4px", verticalAlign: "top" }}>
                        <Text as="p" size="1">
                          {artist.artistName}
                        </Text>
                      </td>
                      <td style={{ padding: "8px 4px", verticalAlign: "top" }}>
                        <Text as="p" size="1">
                          {override || artist.genre}
                        </Text>
                      </td>
                      <td style={{ padding: "8px 4px", verticalAlign: "top" }}>
                        <Text as="p" size="0" color="2">
                          {override ? "override" : "observed"}
                        </Text>
                      </td>
                      <td style={{ padding: "8px 4px", verticalAlign: "top" }}>
                        <Text as="p" size="0" color="2">
                          {artist.count}
                        </Text>
                      </td>
                      <td style={{ padding: "8px 4px", verticalAlign: "top" }}>
                        <Text as="p" size="0" color="2">
                          {artist.lastSeenIso}
                        </Text>
                      </td>
                      <td style={{ padding: "8px 4px", verticalAlign: "top" }}>
                        <div className="calendar-auth-form-row">
                          <input
                            className="calendar-auth-input"
                            placeholder="set canonical genre"
                            value={
                              artistGenreDrafts[artist.artistKey] ?? override
                            }
                            onChange={(e) =>
                              setArtistGenreDrafts((prev) => ({
                                ...prev,
                                [artist.artistKey]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="calendar-auth-submit"
                            onClick={() =>
                              onSetArtistOverride(artist.artistKey)
                            }
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="calendar-auth-submit"
                            onClick={() =>
                              runAndRefresh(() =>
                                removeArtistOverride({
                                  data: { artistKey: artist.artistKey },
                                }),
                              )
                            }
                          >
                            Clear
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
