import { useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Text } from "@/components/Text";

import "./Navigation.styles.css";

const PAGE_LINKS = [
	{ href: "/", label: "Home" },
	{ href: "/posts", label: "Writing" },
	{ href: "/listening", label: "Listening" },
	{ href: "/reading", label: "Reading" },
	{ href: "/racing", label: "Racing" },
	{ href: "/uses", label: "Uses" },
] as const;

const SOCIAL_LINKS = [
	{
		href: "https://github.com/kylemcd",
		label: "GitHub",
		iconClassName: "hn hn-github",
		external: true,
	},
	{
		href: "https://x.com/kpmdev",
		label: "X",
		iconClassName: "hn hn-x",
		external: true,
	},
	{
		href: "https://www.linkedin.com/in/kylemcd1/",
		label: "LinkedIn",
		iconClassName: "hn hn-linkedin",
		external: true,
	},
	{
		href: "/rss.xml",
		label: "RSS Feed",
		iconClassName: "hn hn-rss",
		external: false,
		type: "application/rss+xml",
	},
] as const;

function Navigation() {
	const [open, setOpen] = useState(false);
	const location = useLocation();

	const onThemeChange = (theme: "light" | "dark") => {
		document.documentElement.setAttribute("data-appearance", theme);
		document.cookie = `theme=${theme}; path=/`;
	};

	const closeMenu = () => setOpen(false);

	const isActiveLink = (href: string): boolean => {
		const pathname = location.pathname;
		if (href === "/") {
			return pathname === "/";
		}

		return pathname === href || pathname.startsWith(`${href}/`);
	};

	useEffect(() => {
		if (!open) {
			return undefined;
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(false);
			}
		};

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		document.addEventListener("keydown", onKeyDown);

		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	return (
		<>
			<nav className="navigation" aria-label="Primary">
				<Text as="a" size="2" href="/" className="navigation-logo">
					Kyle McDonald
				</Text>
				<div className="navigation-menu-container" data-open={open}>
					<button
						type="button"
						className="navigation-menu-button"
						onClick={() => setOpen((value) => !value)}
						aria-expanded={open}
						aria-controls="site-navigation-overlay"
						aria-label={open ? "Close menu" : "Open menu"}
						data-open={open}
					>
						<span className="navigation-sr-only">
							{open ? "Close menu" : "Open menu"}
						</span>
						<i className="hn hn-angle-left" aria-hidden="true" />
					</button>
					<fieldset className="navigation-theme-switcher navigation-top-theme-switcher">
						<legend className="navigation-sr-only">Theme</legend>
						<button
							type="button"
							className="navigation-theme-switcher-button"
							onClick={() => onThemeChange("light")}
							data-theme="light"
							aria-label="Switch to light theme"
						>
							<span className="navigation-sr-only">Light</span>
							<i className="hn hn-sun" aria-hidden="true" />
						</button>
						<button
							type="button"
							className="navigation-theme-switcher-button"
							onClick={() => onThemeChange("dark")}
							data-theme="dark"
							aria-label="Switch to dark theme"
						>
							<span className="navigation-sr-only">Dark</span>
							<i className="hn hn-moon" aria-hidden="true" />
						</button>
					</fieldset>
				</div>
			</nav>

			<div
				id="site-navigation-overlay"
				className="navigation-overlay"
				data-open={open}
			>
				<button
					type="button"
					className="navigation-overlay-dismiss"
					onClick={closeMenu}
				>
					<span className="navigation-sr-only">Close navigation menu</span>
				</button>
				<div className="navigation-overlay-frame">
					<div className="navigation-overlay-panel">
						<div className="navigation-overlay-content">
							<div className="navigation-overlay-main">
								<ul className="navigation-page-links">
									{PAGE_LINKS.map((link) => (
										<li key={link.href}>
											<a
												href={link.href}
												className="navigation-page-link"
												data-active={isActiveLink(link.href)}
												onClick={closeMenu}
											>
												{link.label}
											</a>
										</li>
									))}
								</ul>
								<div className="navigation-social-links">
									{SOCIAL_LINKS.map((link) => (
										<a
											key={link.href}
											href={link.href}
											className="navigation-social-link"
											aria-label={link.label}
											target={link.external ? "_blank" : undefined}
											rel={link.external ? "noopener noreferrer" : undefined}
											type={link.type}
										>
											<i className={link.iconClassName} aria-hidden="true" />
											<span className="navigation-sr-only">{link.label}</span>
										</a>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

export { Navigation };
