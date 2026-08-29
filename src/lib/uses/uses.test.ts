import { Result } from "better-result";
import { describe, expect, it } from "vitest";

import { parseUsesMarkdown } from "./uses";

describe("parseUsesMarkdown", () => {
	it("parses valid markdown tables with required headers", () => {
		const input = `
| Name | Description | Tags |
| --- | --- | --- |
| MacBook | Main machine | Hardware, Apple |
| VS Code | Editor | Software, Development |
`;

		const result = parseUsesMarkdown(input);

		expect(Result.isOk(result)).toBe(true);
		if (Result.isError(result)) return;
		expect(result.value).toHaveLength(2);
		expect(result.value[0]).toEqual({
			name: "MacBook",
			description: "Main machine",
			tags: ["Hardware", "Apple"],
			order: 0,
		});
		expect(result.value[1]?.order).toBe(1);
	});

	it("returns a typed error when required headers are missing", () => {
		const input = `
| Name | Notes | Tags |
| --- | --- | --- |
| MacBook | Main machine | Hardware |
`;

		const result = parseUsesMarkdown(input);
		expect(Result.isError(result)).toBe(true);
		if (Result.isOk(result)) return;
		expect(result.error).toMatchObject({
			_tag: "UsesParseError",
			reason: "missing_columns",
			missingColumns: ["Description"],
		});
	});

	it("skips fully empty table rows", () => {
		const input = `
| Name | Description | Tags |
| --- | --- | --- |
| MacBook | Main machine | Hardware |
|  |  |  |
| VS Code | Editor | Software |
`;

		const result = parseUsesMarkdown(input);
		expect(Result.isOk(result)).toBe(true);
		if (Result.isError(result)) return;
		expect(result.value).toHaveLength(2);
		expect(result.value.map((item) => item.name)).toEqual([
			"MacBook",
			"VS Code",
		]);
	});

	it("normalizes tags for filtering while preserving display casing", () => {
		const input = `
| Name | Description | Tags |
| --- | --- | --- |
| Example | Demo | Hardware, hardware, HARDWARE, Desk Setup |
`;

		const result = parseUsesMarkdown(input);
		expect(Result.isOk(result)).toBe(true);
		if (Result.isError(result)) return;
		expect(result.value[0]?.tags).toEqual(["Hardware", "Desk Setup"]);
	});

	it("parses optional link cells including markdown link syntax", () => {
		const input = `
| Name | Description | Tags | Link |
| --- | --- | --- | --- |
| Raycast | Launcher | Software | https://www.raycast.com/ |
| VS Code | Editor | Software | [Open](https://code.visualstudio.com/) |
`;

		const result = parseUsesMarkdown(input);
		expect(Result.isOk(result)).toBe(true);
		if (Result.isError(result)) return;
		expect(result.value[0]?.link).toBe("https://www.raycast.com/");
		expect(result.value[1]?.link).toBe("https://code.visualstudio.com/");
	});

	it("returns a typed error for unsafe javascript links", () => {
		const input = `
| Name | Description | Tags | Link |
| --- | --- | --- | --- |
| Example | Demo | Software | javascript:alert(1) |
`;

		const result = parseUsesMarkdown(input);
		expect(Result.isError(result)).toBe(true);
		if (Result.isOk(result)) return;
		expect(result.error).toMatchObject({
			_tag: "UsesParseError",
			reason: "unsafe_link",
		});
	});
});
