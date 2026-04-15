import { Input } from "@base-ui/react/input";
import { Select } from "@base-ui/react/select";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { Text } from "@/components/Text";
import type { UseItem } from "@/lib/uses";

import { filterUsesItems } from "./filterUses";
import "./UsesTable.styles.css";

type UsesTableProps = {
  items: ReadonlyArray<UseItem>;
};

type TagOption = {
  key: string;
  label: string;
};

type TagPillStyle = CSSProperties &
  Record<
    | "--tag-hue"
    | "--tag-sat"
    | "--tag-light"
    | "--tag-border-sat"
    | "--tag-border-light"
    | "--tag-light-sat"
    | "--tag-light-bg"
    | "--tag-light-border-sat"
    | "--tag-light-border",
    string
  >;

const isExternalLink = (link: string): boolean =>
  /^https?:\/\//i.test(link) || link.startsWith("//");

const openUseLink = (link: string): void => {
  if (isExternalLink(link)) {
    window.open(link, "_blank", "noopener,noreferrer");
    return;
  }

  window.location.assign(link);
};

const buildTagOptions = (items: ReadonlyArray<UseItem>): TagOption[] => {
  const optionMap = new Map<string, string>();

  for (const item of items) {
    for (const tag of item.tags) {
      const label = tag.trim();
      if (!label) {
        continue;
      }

      const key = label.toLowerCase();
      if (!optionMap.has(key)) {
        optionMap.set(key, label);
      }
    }
  }

  return Array.from(optionMap.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

const buildTagPillStyles = (
  tagOptions: ReadonlyArray<TagOption>,
): ReadonlyMap<string, TagPillStyle> => {
  const circularHueDistance = (a: number, b: number): number => {
    const diff = Math.abs(a - b);
    return Math.min(diff, 360 - diff);
  };

  const hashTagKey = (tagKey: string): number => {
    let hash = 2166136261;
    for (let i = 0; i < tagKey.length; i += 1) {
      hash ^= tagKey.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  };

  const usedHues: number[] = [];
  const styleMap = new Map<string, TagPillStyle>();

  tagOptions.forEach((tag) => {
    const hash = hashTagKey(tag.key);
    let hue = hash % 360;
    let attempts = 0;

    // Nudge hue by golden-angle increments until it is distinct enough
    // from hues already assigned in this markdown-derived tag list.
    while (
      usedHues.some((usedHue) => circularHueDistance(usedHue, hue) < 20) &&
      attempts < 24
    ) {
      hue = (hue + 137.508) % 360;
      attempts += 1;
    }

    usedHues.push(hue);

    const satOffset = (hash >>> 4) % 3;
    const lightOffset = (hash >>> 7) % 2;

    styleMap.set(tag.key, {
      "--tag-hue": `${hue.toFixed(2)}deg`,
      "--tag-sat": `${38 + satOffset * 6}%`,
      "--tag-light": `${28 + lightOffset * 4}%`,
      "--tag-border-sat": `${54 + satOffset * 5}%`,
      "--tag-border-light": `${48 + lightOffset * 4}%`,
      "--tag-light-sat": `${48 + satOffset * 4}%`,
      "--tag-light-bg": `${74 + lightOffset * 3}%`,
      "--tag-light-border-sat": `${58 + satOffset * 4}%`,
      "--tag-light-border": `${52 + lightOffset * 4}%`,
    });
  });

  return styleMap;
};

const selectedTagSummary = (
  selectedTagKeys: ReadonlyArray<string>,
  tagOptions: ReadonlyArray<TagOption>,
): string => {
  if (selectedTagKeys.length === 0) {
    return "All tags";
  }

  if (selectedTagKeys.length === 1) {
    const selected = tagOptions.find((tag) => tag.key === selectedTagKeys[0]);
    return selected?.label ?? "1 selected";
  }

  return `${selectedTagKeys.length} selected`;
};

function UsesTable({ items }: UsesTableProps) {
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
            <label htmlFor="uses-search" className="uses-sr-only">
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
            <label htmlFor="uses-tag-filter-trigger" className="uses-sr-only">
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
                  className={
                    item.link && item.link !== "—"
                      ? "uses-table-row-linkable"
                      : undefined
                  }
                  onClick={
                    item.link && item.link !== "—"
                      ? () => openUseLink(item.link)
                      : undefined
                  }
                  onKeyDown={
                    item.link
                      ? (event) => {
                          if (
                            (event.key !== "Enter" && event.key !== " ") ||
                            item.link === "—"
                          ) {
                            return;
                          }

                          event.preventDefault();
                          openUseLink(item.link);
                        }
                      : undefined
                  }
                  tabIndex={item.link ? 0 : undefined}
                  role={item.link ? "link" : undefined}
                  aria-label={item.link ? `Open ${item.name}` : undefined}
                >
                  <td>
                    <Text as="p" size="0" weight="500">
                      {item.name}
                    </Text>
                  </td>
                  <td>
                    <Text as="p" size="0" color="2">
                      {item.description}
                    </Text>
                  </td>
                  <td>
                    <div className="uses-tags-cell">
                      {item.tags.map((tag) => (
                        // Use the normalized key to keep colors consistent
                        // across table rows and dropdown options.
                        // Tags are normalized similarly in buildTagOptions.
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
}

export { UsesTable };
