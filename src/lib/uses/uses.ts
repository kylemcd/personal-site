import { Result, TaggedError } from "better-result";

const USES_MARKDOWN_PATH = "../../../content/uses.md";
const REQUIRED_COLUMNS = ["Name", "Description", "Tags"] as const;
const OPTIONAL_LINK_COLUMNS = ["Link", "URL", "Href"] as const;

const USES_FILES = import.meta.glob("../../../content/uses.md", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

export type UseItem = {
	name: string;
	description: string;
	tags: string[];
	link?: string;
	order: number;
};

type TableSlice = {
	headers: string[];
	rows: string[][];
};

type UsesParseErrorReason =
	| "empty_markdown"
	| "missing_table"
	| "missing_columns"
	| "unsafe_link";

class UsesParseError extends TaggedError("UsesParseError")<{
	readonly message: string;
	readonly reason: UsesParseErrorReason;
	readonly missingColumns?: ReadonlyArray<string>;
}>() {}

class UsesContentError extends TaggedError("UsesContentError")<{
	readonly message: string;
	readonly path: string;
}>() {}

const isTableRow = (line: string): boolean => line.includes("|");

const isDividerRow = (line: string): boolean => {
	const trimmed = line.trim();
	if (!trimmed) {
		return false;
	}

	const normalized = trimmed.replace(/^\|\s*/, "").replace(/\s*\|$/, "");
	if (!normalized) {
		return false;
	}

	return normalized
		.split("|")
		.map((cell) => cell.trim())
		.every((cell) => /^:?-{3,}:?$/.test(cell));
};

const toCells = (line: string): string[] => {
	const normalized = line
		.trim()
		.replace(/^\|\s*/, "")
		.replace(/\s*\|$/, "");
	return normalized.split("|").map((cell) => cell.trim());
};

const findFirstTable = (rawMarkdown: string): TableSlice | null => {
	const lines = rawMarkdown.split(/\r?\n/);

	for (let i = 0; i < lines.length - 1; i += 1) {
		const headerLine = lines[i]?.trim() ?? "";
		const dividerLine = lines[i + 1]?.trim() ?? "";

		if (!isTableRow(headerLine) || !isDividerRow(dividerLine)) {
			continue;
		}

		const headers = toCells(headerLine);
		const rows: string[][] = [];

		for (let j = i + 2; j < lines.length; j += 1) {
			const rowLine = lines[j]?.trim() ?? "";
			if (!rowLine || !isTableRow(rowLine)) {
				break;
			}

			rows.push(toCells(rowLine));
		}

		return { headers, rows };
	}

	return null;
};

const normalizeTags = (rawTags: string): string[] => {
	const deduped = new Map<string, string>();

	for (const rawTag of rawTags.split(",")) {
		const label = rawTag.trim();
		if (!label) {
			continue;
		}

		const key = label.toLowerCase();
		if (!deduped.has(key)) {
			deduped.set(key, label);
		}
	}

	return Array.from(deduped.values());
};

const PLACEHOLDER_CELLS = new Set(["—", "-", "n/a", "none", ""]);

const normalizeLink = (
	rawLink: string,
): Result<string | undefined, UsesParseError> => {
	const trimmed = rawLink.trim();
	if (!trimmed || PLACEHOLDER_CELLS.has(trimmed.toLowerCase())) {
		return Result.ok(undefined);
	}

	const markdownLinkMatch = trimmed.match(/^\[[^\]]+\]\((.+)\)$/);
	const extractedUrl = markdownLinkMatch?.[1]?.trim() ?? trimmed;
	const unwrappedUrl = extractedUrl.replace(/^<(.+)>$/, "$1").trim();
	const normalizedScheme = unwrappedUrl.toLowerCase();

	if (normalizedScheme.startsWith("javascript:")) {
		return Result.err(
			new UsesParseError({
				reason: "unsafe_link",
				message: "Invalid uses table link. javascript: URLs are not allowed.",
			}),
		);
	}

	return Result.ok(unwrappedUrl || undefined);
};

export const parseUsesMarkdown = (
	rawMarkdown: string,
): Result<UseItem[], UsesParseError> => {
	if (!rawMarkdown?.trim()) {
		return Result.err(
			new UsesParseError({
				reason: "empty_markdown",
				message: "The uses markdown file is empty.",
			}),
		);
	}

	const table = findFirstTable(rawMarkdown);
	if (!table) {
		return Result.err(
			new UsesParseError({
				reason: "missing_table",
				message:
					"No markdown table was found in content/uses.md. Add a table with Name, Description, and Tags columns (optional Link column supported).",
			}),
		);
	}

	const headerIndexMap = new Map<string, number>();
	table.headers.forEach((header, index) => {
		headerIndexMap.set(header, index);
	});

	const missingColumns = REQUIRED_COLUMNS.filter(
		(columnName) => !headerIndexMap.has(columnName),
	);
	if (missingColumns.length > 0) {
		return Result.err(
			new UsesParseError({
				reason: "missing_columns",
				missingColumns,
				message: `Invalid uses table headers. Missing required column(s): ${missingColumns.join(", ")}. Expected headers: ${REQUIRED_COLUMNS.join(" | ")}.`,
			}),
		);
	}

	const items: UseItem[] = [];

	for (const row of table.rows) {
		const name = row[headerIndexMap.get("Name") ?? -1]?.trim() ?? "";
		const description =
			row[headerIndexMap.get("Description") ?? -1]?.trim() ?? "";
		const rawTags = row[headerIndexMap.get("Tags") ?? -1]?.trim() ?? "";
		const rawLink =
			OPTIONAL_LINK_COLUMNS.map(
				(columnName) => row[headerIndexMap.get(columnName) ?? -1]?.trim() ?? "",
			).find(Boolean) ?? "";

		if (!name && !description && !rawTags && !rawLink) {
			continue;
		}

		const linkResult = normalizeLink(rawLink);
		if (Result.isError(linkResult)) return linkResult;
		const link = linkResult.value;

		items.push({
			name,
			description,
			tags: normalizeTags(rawTags),
			...(link ? { link } : {}),
			order: items.length,
		});
	}

	return Result.ok(items);
};

const getRawUsesMarkdown = (): Result<string, UsesContentError> => {
	const markdown = USES_FILES[USES_MARKDOWN_PATH];
	if (!markdown) {
		return Result.err(
			new UsesContentError({
				path: USES_MARKDOWN_PATH,
				message: "Unable to load content/uses.md.",
			}),
		);
	}

	return Result.ok(markdown);
};

const list = (): Result<UseItem[], UsesContentError | UsesParseError> =>
	getRawUsesMarkdown().andThen(parseUsesMarkdown);

export const uses = {
	list,
};
