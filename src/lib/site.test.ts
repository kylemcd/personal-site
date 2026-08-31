import { describe, expect, it } from "vitest";

import { getCanonicalSiteRedirect, redirectToCanonicalSite } from "@/lib/site";

describe("getCanonicalSiteRedirect", () => {
	it.each(["kylemcd.com", "www.kylemcd.com", "www.kpm.sh"])(
		"redirects %s to the canonical host",
		(hostname) => {
			const redirect = redirectToCanonicalSite(
				`https://${hostname}/posts/example?source=legacy`,
			);

			expect(redirect?.status).toBe(308);
			expect(redirect?.headers.get("location")).toBe(
				"https://kpm.sh/posts/example?source=legacy",
			);
		},
	);

	it("upgrades legacy HTTP URLs while preserving the path and query", () => {
		const redirect = getCanonicalSiteRedirect(
			"http://kylemcd.com/uses?view=compact",
		);

		expect(redirect?.toString()).toBe("https://kpm.sh/uses?view=compact");
	});

	it.each(["https://kpm.sh/posts", "https://example.com/posts"])(
		"does not redirect %s",
		(url) => {
			expect(redirectToCanonicalSite(url)).toBeNull();
		},
	);
});
