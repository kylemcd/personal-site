import { Text } from "@/components/Text";

import "./Footer.styles.css";

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
	},
] as const;

function Footer() {
	return (
		<footer className="footer-container">
			<Text as="span" size="1" color="2">
				&copy; 2011-{new Date().getFullYear()} — Kyle McDonald
			</Text>
			<nav className="footer-social-links" aria-label="Social links">
				{SOCIAL_LINKS.map((link) => (
					<a
						key={link.href}
						href={link.href}
						className="footer-social-link"
						aria-label={link.label}
						title={link.label}
						target={link.external ? "_blank" : undefined}
						rel={link.external ? "noopener noreferrer" : undefined}
					>
						<i className={link.iconClassName} aria-hidden="true" />
						<span className="sr-only">{link.label}</span>
					</a>
				))}
			</nav>
		</footer>
	);
}

export { Footer };
