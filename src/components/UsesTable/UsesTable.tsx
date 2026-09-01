import { Input } from "@base-ui/react/input";
import { Select } from "@base-ui/react/select";
import { useMemo, useState } from "react";

import { Text } from "@/components/Text";
import type { UseItem } from "@/lib/uses";

import { filterUsesItems } from "./filterUses";
import {
	buildTagOptions,
	buildTagPillStyles,
	selectedTagSummary,
} from "./tag-options";
import "./UsesTable.styles.css";

type UsesTableProps = {
	items: ReadonlyArray<UseItem>;
};

const isExternalLink = (link: string): boolean =>
	/^https?:\/\//i.test(link) || link.startsWith("//");

const UsesTable = ({ items }: UsesTableProps) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTagKeys, setSelectedTagKeys] = useState<string[]>([]);

	const tagOptions = useMemo(() => buildTagOptions(items), [items]);
	const tagPillStyles = useMemo(
		() => buildTagPillStyles(tagOptions),
		[tagOptions],
	);

	const filteredItems = useMemo(
		() =>
			filterUsesItems({
				items,
				searchQuery,
				selectedTagKeys,
			}),
		[items, searchQuery, selectedTagKeys],
	);

	return (
		<div className="uses-table-root">
			<div className="uses-controls">
				<Text as="h2" size="2" className="uses-controls-title">
					Uses
				</Text>
				<div className="uses-controls-right">
					<div className="uses-search">
						<label htmlFor="uses-search" className="sr-only">
							Search
						</label>
						<Input
							id="uses-search"
							className="uses-search-input"
							placeholder="Search name or description"
							value={searchQuery}
							onValueChange={(value) => setSearchQuery(value)}
						/>
					</div>

					<div className="uses-tag-filter">
						<label htmlFor="uses-tag-filter-trigger" className="sr-only">
							Tags
						</label>
						<Select.Root<string, true>
							multiple
							value={selectedTagKeys}
							onValueChange={(value) => setSelectedTagKeys(value)}
						>
							<Select.Trigger
								id="uses-tag-filter-trigger"
								className="uses-tags-trigger"
								aria-label="Filter by tag"
								disabled={tagOptions.length === 0}
							>
								<span className="uses-tags-trigger-value">
									{selectedTagSummary(selectedTagKeys, tagOptions)}
								</span>
								<i className="hn hn-angle-down" aria-hidden="true" />
							</Select.Trigger>
							<Select.Portal>
								<Select.Positioner
									sideOffset={6}
									align="start"
									className="uses-tags-positioner"
								>
									<Select.Popup className="uses-tags-popup">
										<Select.List className="uses-tags-list">
											{tagOptions.map((tag) => (
												<Select.Item
													key={tag.key}
													value={tag.key}
													className="uses-tags-item"
												>
													<Select.ItemIndicator
														className="uses-tags-item-indicator"
														keepMounted
													>
														<i className="hn hn-check" aria-hidden="true" />
													</Select.ItemIndicator>
													<Select.ItemText>
														<span
															className="uses-tag-pill uses-tag-pill-dropdown"
															style={tagPillStyles.get(tag.key)}
														>
															{tag.label}
														</span>
													</Select.ItemText>
												</Select.Item>
											))}
										</Select.List>
									</Select.Popup>
								</Select.Positioner>
							</Select.Portal>
						</Select.Root>
					</div>
				</div>
			</div>

			{filteredItems.length === 0 ? (
				<div className="uses-empty-state">
					<Text as="p" size="1">
						No matches for your current filters.
					</Text>
					<Text as="p" size="0" color="2">
						Try clearing filters or searching with fewer terms.
					</Text>
				</div>
			) : (
				<div className="uses-table-scroll">
					<table className="uses-table">
						<thead>
							<tr>
								<th scope="col">Name</th>
								<th scope="col">Description</th>
								<th scope="col">Tags</th>
							</tr>
						</thead>
						<tbody>
							{filteredItems.map((item) => (
								<tr
									key={`${item.order}-${item.name}`}
									data-link={item.link ? "true" : "false"}
								>
									<td>
										{item.link ? (
											<a
												className="uses-row-link"
												href={item.link}
												target={
													isExternalLink(item.link) ? "_blank" : undefined
												}
												rel={
													isExternalLink(item.link)
														? "noopener noreferrer"
														: undefined
												}
												aria-label={`Open ${item.name}`}
											>
												<Text as="p" size="0" weight="500">
													{item.name}
												</Text>
											</a>
										) : (
											<Text as="p" size="0" weight="500">
												{item.name}
											</Text>
										)}
									</td>
									<td>
										<Text as="p" size="0" color="2">
											{item.description}
										</Text>
									</td>
									<td>
										<div className="uses-tags-cell">
											{item.tags.map((tag) => (
												<span
													key={`${item.name}-${tag}`}
													className="uses-tag-pill"
													style={tagPillStyles.get(tag.toLowerCase())}
												>
													{tag}
												</span>
											))}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

export { UsesTable };
