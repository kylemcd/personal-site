import { useState, useMemo } from "react";
import "./Uses.styles.css";

interface UseItem {
	name: string;
	description: string;
	tags: string[];
	url?: string;
}

const items: UseItem[] = [
	{
		name: "MacBook Pro 16\" (2023)",
		description: "M3 Max, primary development machine",
		tags: ["Hardware", "Computing"],
	},
	{
		name: "iPhone 15 Pro",
		description: "Mobile device",
		tags: ["Hardware", "Mobile"],
	},
	{
		name: "iPad Air",
		description: "Tablet for content and travel",
		tags: ["Hardware", "Mobile"],
	},
	{
		name: "Apple Watch",
		description: "Health and notifications",
		tags: ["Hardware", "Wearable"],
	},
	{
		name: "VS Code",
		description: "Primary code editor",
		tags: ["Software", "Development", "Editor"],
		url: "https://code.visualstudio.com",
	},
	{
		name: "Cursor",
		description: "AI-powered development environment",
		tags: ["Software", "Development", "AI", "Editor"],
		url: "https://cursor.com",
	},
	{
		name: "Figma",
		description: "Design and prototyping",
		tags: ["Software", "Design", "Collaboration"],
		url: "https://figma.com",
	},
	{
		name: "Arc",
		description: "Modern web browser",
		tags: ["Software", "Browser"],
		url: "https://arc.net",
	},
	{
		name: "TypeScript",
		description: "Primary programming language",
		tags: ["Development", "Language"],
	},
	{
		name: "React",
		description: "Frontend framework",
		tags: ["Development", "Framework", "Frontend"],
	},
	{
		name: "Node.js",
		description: "JavaScript runtime environment",
		tags: ["Development", "Runtime", "Backend"],
	},
	{
		name: "Cloudflare Workers",
		description: "Edge computing platform",
		tags: ["Development", "Infrastructure", "Backend"],
	},
	{
		name: "Obsidian",
		description: "Note-taking and knowledge management",
		tags: ["Software", "Productivity", "Knowledge"],
		url: "https://obsidian.md",
	},
	{
		name: "Linear",
		description: "Issue tracking and project management",
		tags: ["Software", "Productivity", "Collaboration"],
		url: "https://linear.app",
	},
	{
		name: "Slack",
		description: "Team communication platform",
		tags: ["Software", "Communication", "Collaboration"],
	},
	{
		name: "Notion",
		description: "Documentation and workspace",
		tags: ["Software", "Productivity", "Knowledge"],
		url: "https://notion.so",
	},
];

function Uses() {
	const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

	// Get all unique tags
	const allTags = useMemo(() => {
		const tags = new Set<string>();
		items.forEach((item) => {
			item.tags.forEach((tag) => tags.add(tag));
		});
		return Array.from(tags).sort();
	}, []);

	// Filter items based on selected tags
	const filteredItems = useMemo(() => {
		if (selectedTags.size === 0) return items;

		return items.filter((item) =>
			Array.from(selectedTags).every((tag) => item.tags.includes(tag)),
		);
	}, [selectedTags]);

	// Sort items by number of matching tags (most relevant first)
	const sortedItems = useMemo(() => {
		if (selectedTags.size === 0) return filteredItems;

		return [...filteredItems].sort((a, b) => {
			const aMatches = a.tags.filter((tag) => selectedTags.has(tag)).length;
			const bMatches = b.tags.filter((tag) => selectedTags.has(tag)).length;
			return bMatches - aMatches;
		});
	}, [filteredItems, selectedTags]);

	const toggleTag = (tag: string) => {
		const newTags = new Set(selectedTags);
		if (newTags.has(tag)) {
			newTags.delete(tag);
		} else {
			newTags.add(tag);
		}
		setSelectedTags(newTags);
	};

	return (
		<div className="uses-container">
			<div className="uses-tags-filter">
				<div className="uses-filter-label">Filter by tags:</div>
				<div className="uses-filter-tags">
					{allTags.map((tag) => (
						<button
							key={tag}
							className={`uses-filter-tag ${selectedTags.has(tag) ? "active" : ""}`}
							onClick={() => toggleTag(tag)}
						>
							{tag}
						</button>
					))}
				</div>
			</div>

			<div className="uses-results-count">
				Showing {sortedItems.length} of {items.length} items
			</div>

			<table className="uses-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Description</th>
						<th>Tags</th>
					</tr>
				</thead>
				<tbody>
					{sortedItems.map((item) => (
						<tr key={item.name}>
							<td className="uses-table-name">
								{item.url ? (
									<a
										href={item.url}
										target="_blank"
										rel="noopener noreferrer"
										className="uses-table-link"
									>
										{item.name}
									</a>
								) : (
									item.name
								)}
							</td>
							<td className="uses-table-description">{item.description}</td>
							<td className="uses-table-tags">
								<div className="uses-tags">
									{item.tags.map((tag) => (
										<button
											key={tag}
											className={`uses-tag ${selectedTags.has(tag) ? "selected" : ""}`}
											onClick={() => toggleTag(tag)}
										>
											{tag}
										</button>
									))}
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{sortedItems.length === 0 && (
				<div className="uses-empty-state">
					No items match the selected tags. Try a different combination.
				</div>
			)}
		</div>
	);
}

export { Uses };
