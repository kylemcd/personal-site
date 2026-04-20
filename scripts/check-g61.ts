import { Effect } from "effect";
import { garage61 } from "../src/lib/garage61";

const summary = await Effect.runPromise(garage61.summary());

console.log("window", summary.derived.overview.windowLabel);
console.log(
  "recentTracks",
  summary.derived.overview.recentTracks
    .slice(0, 8)
    .map((t) => ({ name: t.name, time: t.timeOnTrackSeconds, share: t.timeSharePercentage })),
);
console.log(
  "recentCars",
  summary.derived.overview.recentCars
    .slice(0, 8)
    .map((c) => ({ name: c.name, time: c.timeOnTrackSeconds, share: c.timeSharePercentage })),
);
console.log("sessionBreakdown", summary.derived.overview.insights.sessionTimeBreakdown);
