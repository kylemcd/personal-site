import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { Result } from "better-result";
import { useState } from "react";
import { z } from "zod";

import { CalendarView } from "@/components/CalendarView";
import { ErrorComponent } from "@/components/ErrorComponent";
import { Text } from "@/components/Text";
import { calendar, type CalendarData } from "@/lib/calendar";
import { env } from "@/lib/env";
import { buildMeta } from "@/lib/meta";

import "@/styles/routes/calendar.css";

const CALENDAR_AUTH_COOKIE = "calendar-auth";

const isAuthCookieValid = (): boolean => {
	const expected = env.CALENDAR_AUTH;
	if (!expected) return true; // No password configured → no gate.
	return getCookie(CALENDAR_AUTH_COOKIE) === expected;
};

type LoaderData =
	| { authRequired: true; data?: undefined; error?: undefined }
	| { authRequired: false; data: CalendarData | null; error?: undefined };

const getData = createServerFn({ method: "GET" }).handler(
	async (): Promise<LoaderData> => {
		if (!isAuthCookieValid()) {
			return { authRequired: true };
		}
		const result = await calendar.lastSevenDays();
		return {
			authRequired: false,
			data: Result.isOk(result) ? result.value : null,
		};
	},
);

const signInToCalendar = createServerFn({ method: "POST" })
	.inputValidator(z.object({ password: z.string() }))
	.handler(async ({ data }): Promise<{ ok: boolean }> => {
		const expected = env.CALENDAR_AUTH;
		if (!expected) return { ok: true };
		if (data.password !== expected) return { ok: false };
		setCookie(CALENDAR_AUTH_COOKIE, expected, {
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
			path: "/",
			maxAge: 60 * 60 * 24 * 30, // 30 days
		});
		return { ok: true };
	});

export const Route = createFileRoute("/calendar/")({
	component: CalendarRoute,
	loader: () => getData(),
	errorComponent: ErrorComponent,
	head: () => ({
		meta: buildMeta({
			title: "Calendar - Kyle McDonald",
			url: "https://kylemcd.com/calendar",
		}),
	}),
});

function CalendarRoute() {
	const loaderData = Route.useLoaderData();

	if (loaderData.authRequired) {
		return <CalendarAuthGate />;
	}

	const { data } = loaderData;
	if (!data) {
		return (
			<div className="section-container">
				<Text as="p" size="1" color="2">
					No calendar data available right now.
				</Text>
			</div>
		);
	}

	return (
		<div className="section-container calendar-page-section">
			<CalendarView data={data} />
		</div>
	);
}

function CalendarAuthGate() {
	const router = useRouter();
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const onSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			const res = await signInToCalendar({ data: { password } });
			if (res.ok) {
				await router.invalidate();
			} else {
				setError("Wrong password.");
			}
		} catch (err) {
			setError("Something went wrong. Try again.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="section-container calendar-page-section">
			<form className="calendar-auth-form" onSubmit={onSubmit}>
				<Text as="label" size="1" color="2" htmlFor="calendar-password">
					This page is private. Enter the password to continue.
				</Text>
				<div className="calendar-auth-form-row">
					<input
						id="calendar-password"
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
