import { Menu } from "@base-ui/react/menu";
import { useEffect, useState } from "react";

import "./ThemeToggle.styles.css";

type Appearance = "light" | "dark";

function getAppearance(): Appearance {
	return document.documentElement.getAttribute("data-appearance") === "light"
		? "light"
		: "dark";
}

function setAppearance(appearance: Appearance) {
	document.documentElement.setAttribute("data-appearance", appearance);

	if (window.cookieStore) {
		void window.cookieStore.set({
			name: "theme",
			value: appearance,
			path: "/",
		});
		return;
	}

	// biome-ignore lint/suspicious/noDocumentCookie: fallback for browsers without the Cookie Store API
	document.cookie = `theme=${appearance}; path=/; max-age=31536000; SameSite=Lax`;
}

function ThemeToggle() {
	const [appearance, setCurrentAppearance] = useState<Appearance>("dark");

	useEffect(() => {
		setCurrentAppearance(getAppearance());
	}, []);

	const onValueChange = (value: unknown) => {
		if (value !== "light" && value !== "dark") {
			return;
		}

		setAppearance(value);
		setCurrentAppearance(value);
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
}

export { ThemeToggle };
