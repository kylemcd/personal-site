import { Menu } from "@base-ui/react/menu";
import { useSyncExternalStore } from "react";

import "./ThemeToggle.styles.css";

type Appearance = "light" | "dark";

const APPEARANCE_CHANGE_EVENT = "kpm:appearance-change";

const getAppearance = (): Appearance => {
	return document.documentElement.getAttribute("data-appearance") === "light"
		? "light"
		: "dark";
};

const persistAppearance = async (appearance: Appearance): Promise<void> => {
	if (window.cookieStore) {
		try {
			await window.cookieStore.set({
				name: "theme",
				value: appearance,
				path: "/",
			});
			return;
		} catch {
			// Fall through to the broadly supported cookie API.
		}
	}

	// biome-ignore lint/suspicious/noDocumentCookie: fallback for browsers without the Cookie Store API
	document.cookie = `theme=${appearance}; path=/; max-age=31536000; SameSite=Lax`;
};

const setAppearance = (appearance: Appearance) => {
	document.documentElement.setAttribute("data-appearance", appearance);
	window.dispatchEvent(new Event(APPEARANCE_CHANGE_EVENT));
	void persistAppearance(appearance);
};

const subscribeToAppearance = (onStoreChange: () => void) => {
	window.addEventListener(APPEARANCE_CHANGE_EVENT, onStoreChange);
	return () =>
		window.removeEventListener(APPEARANCE_CHANGE_EVENT, onStoreChange);
};

const getServerAppearance = (): Appearance => "dark";

const ThemeToggle = () => {
	const appearance = useSyncExternalStore(
		subscribeToAppearance,
		getAppearance,
		getServerAppearance,
	);

	const onValueChange = (value: unknown) => {
		if (value !== "light" && value !== "dark") {
			return;
		}

		setAppearance(value);
	};

	return (
		<Menu.RadioGroup
			className="theme-toggle"
			value={appearance}
			onValueChange={onValueChange}
			aria-label="Color theme"
			data-appearance={appearance}
		>
			<Menu.RadioItem
				className="theme-toggle-option"
				value="light"
				closeOnClick={false}
				aria-label="Use light theme"
				title="Light theme"
			>
				<i className="hn hn-sun" aria-hidden="true" />
			</Menu.RadioItem>
			<Menu.RadioItem
				className="theme-toggle-option"
				value="dark"
				closeOnClick={false}
				aria-label="Use dark theme"
				title="Dark theme"
			>
				<i className="hn hn-moon" aria-hidden="true" />
			</Menu.RadioItem>
		</Menu.RadioGroup>
	);
};

export { ThemeToggle };
