import { Result, TaggedError } from "better-result";

import { env } from "@/lib/env";
import { fetchFresh } from "@/lib/fetch";

import {
	IRacingAuthSchema,
	IRacingCarsSchema,
	type IRacingCarType,
	IRacingRecentRacesSchema,
	LinkLookupSchema,
	type Race,
} from "./schema";

class IRacingAuthError extends TaggedError("IRacingAuthError")<{
	readonly error: unknown;
}>() {
	message = "Failed to authenticate with iRacing";
}

const authenticate = async (): Promise<
	Result<{ cookies: string }, IRacingAuthError>
> => {
	const response = await fetchFresh({
		schema: IRacingAuthSchema,
		url: "https://members-ng.iracing.com/auth",
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			email: env.IRACING_EMAIL,
			password: env.IRACING_ENCODED_PASSWORD,
		}),
	});

	if (Result.isError(response)) {
		return Result.err(new IRacingAuthError({ error: response.error }));
	}

	const rawCookies = response.value.headers.getSetCookie?.() ?? [];
	const cookies = rawCookies
		.map((cookie: string) => cookie.split(";")[0])
		.join("; ");
	return Result.ok({ cookies });
};

class IRacingRecentRacesError extends TaggedError("IRacingRecentRacesError")<{
	readonly error: unknown;
}>() {
	message = "Failed to fetch recent races";
}

class IRacingSummaryError extends TaggedError("IRacingSummaryError")<{
	readonly error: unknown;
}>() {
	message = "Failed to fetch summary";
}

class IRacingCarsError extends TaggedError("IRacingCarsError")<{
	readonly error: unknown;
}>() {
	message = "Failed to fetch cars";
}

type IRacingLookupParams = {
	cookies: string;
};

const cars = async ({
	cookies,
}: IRacingLookupParams): Promise<
	Result<ReadonlyArray<IRacingCarType>, IRacingCarsError>
> => {
	const lookup = await fetchFresh({
		schema: LinkLookupSchema,
		url: "https://members-ng.iracing.com/data/car/get",
		method: "GET",
		headers: {
			Cookie: cookies,
			Accept: "application/json",
		},
	});
	if (Result.isError(lookup)) {
		return Result.err(new IRacingCarsError({ error: lookup.error }));
	}

	const response = await fetchFresh({
		schema: IRacingCarsSchema,
		url: lookup.value.data.link,
		method: "GET",
		headers: {
			Cookie: cookies,
			Accept: "application/json",
		},
	});
	if (Result.isError(response)) {
		return Result.err(new IRacingCarsError({ error: response.error }));
	}

	return Result.ok(response.value.data);
};

const recentRaces = async ({
	cookies,
}: IRacingLookupParams): Promise<
	Result<ReadonlyArray<Race>, IRacingRecentRacesError>
> => {
	const lookup = await fetchFresh({
		schema: LinkLookupSchema,
		url: "https://members-ng.iracing.com/data/stats/member_recent_races?cust_id=1008852",
		method: "GET",
		headers: {
			Cookie: cookies,
			Accept: "application/json",
		},
	});
	if (Result.isError(lookup)) {
		return Result.err(new IRacingRecentRacesError({ error: lookup.error }));
	}

	const response = await fetchFresh({
		schema: IRacingRecentRacesSchema,
		url: lookup.value.data.link,
		method: "GET",
		headers: {
			Cookie: cookies,
			Accept: "application/json",
		},
	});
	if (Result.isError(response)) {
		return Result.err(new IRacingRecentRacesError({ error: response.error }));
	}

	return Result.ok(response.value.data.races);
};

const summary = async (): Promise<
	Result<{ races: Array<Race & { car: IRacingCarType }> }, IRacingSummaryError>
> => {
	const auth = await authenticate();
	if (Result.isError(auth)) {
		console.error(auth.error);
		return Result.err(new IRacingSummaryError({ error: auth.error }));
	}

	const [recentRacesData, carsData] = await Promise.all([
		recentRaces({ cookies: auth.value.cookies }),
		cars({ cookies: auth.value.cookies }),
	]);

	if (Result.isError(recentRacesData)) {
		console.error(recentRacesData.error);
		return Result.err(
			new IRacingSummaryError({ error: recentRacesData.error }),
		);
	}
	if (Result.isError(carsData)) {
		console.error(carsData.error);
		return Result.err(new IRacingSummaryError({ error: carsData.error }));
	}

	return Result.ok({
		races: recentRacesData.value.map((race) => ({
			...race,
			car: carsData.value.find(
				(car) => car.car_id === race.car_id,
			) as IRacingCarType,
		})),
	});
};

const iracing = {
	summary,
};

export { iracing };
