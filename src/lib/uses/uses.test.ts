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

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			name: "MacBook",
			description: "Main machine",
			tags: ["Hardware", "Apple"],
			order: 0,
		});
		expect(result[1]?.order).toBe(1);
	});

	it("throws when required headers are missing", () => {
		const input = `
| Name | Notes | Tags |
| --- | --- | --- |
| MacBook | Main machine | Hardware |
`;

		expect(() => parseUsesMarkdown(input)).toThrow(
			"Missing required column(s): Description",
		);
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
		expect(result).toHaveLength(2);
		expect(result.map((item) => item.name)).toEqual(["MacBook", "VS Code"]);
	});

	it("normalizes tags for filtering while preserving display casing", () => {
		const input = `
| Name | Description | Tags |
| --- | --- | --- |
| Example | Demo | Hardware, hardware, HARDWARE, Desk Setup |
`;

		const result = parseUsesMarkdown(input);
		expect(result[0]?.tags).toEqual(["Hardware", "Desk Setup"]);
	});

	it("parses optional link cells including markdown link syntax", () => {
		const input = `
| Name | Description | Tags | Link |
| --- | --- | --- | --- |
| Raycast | Launcher | Software | https://www.raycast.com/ |
| VS Code | Editor | Software | [Open](https://code.visualstudio.com/) |
`;

		const result = parseUsesMarkdown(input);
		expect(result[0]?.link).toBe("https://www.raycast.com/");
		expect(result[1]?.link).toBe("https://code.visualstudio.com/");
	});

	it("throws on unsafe javascript links", () => {
		const input = `
| Name | Description | Tags | Link |
| --- | --- | --- | --- |
| Example | Demo | Software | javascript:alert(1) |
`;

		expect(() => parseUsesMarkdown(input)).toThrow(
			"javascript: URLs are not allowed",
		);
	});
});
