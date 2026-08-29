const SITE_HOSTNAME = "kpm.sh";
export const SITE_URL = `https://${SITE_HOSTNAME}`;

const NON_CANONICAL_SITE_HOSTNAMES = new Set([
	"kylemcd.com",
	"www.kylemcd.com",
	"www.kpm.sh",
]);

export const getCanonicalSiteRedirect = (requestUrl: string): URL | null => {
	const url = new URL(requestUrl);
	if (!NON_CANONICAL_SITE_HOSTNAMES.has(url.hostname)) return null;

	url.protocol = "https:";
	url.hostname = SITE_HOSTNAME;
	url.port = "";
	return url;
};

export const redirectToCanonicalSite = (
	requestUrl: string,
): Response | null => {
	const redirect = getCanonicalSiteRedirect(requestUrl);
	return redirect ? Response.redirect(redirect.toString(), 308) : null;
};
