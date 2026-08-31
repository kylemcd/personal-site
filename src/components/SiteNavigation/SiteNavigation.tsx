import { Menu } from "@base-ui/react/menu";
import { Link, useLocation } from "@tanstack/react-router";

import { ThemeToggle } from "@/components/ThemeToggle";

import "./SiteNavigation.styles.css";

const NAVIGATION_ITEMS = [
	{ label: "Home", to: "/" },
	{ label: "Writing", to: "/posts" },
	{ label: "Racing", to: "/racing" },
	{ label: "Listening", to: "/listening" },
	{ label: "Concerts", to: "/concerts" },
	{ label: "Reading", to: "/reading" },
	{ label: "Uses", to: "/uses" },
] as const;

const SiteNavigation = () => {
	const { pathname } = useLocation();

	return (
		<nav className="site-navigation" aria-label="Site navigation">
			<Menu.Root>
				<Menu.Trigger
					className="site-navigation-trigger"
					aria-label="Open site navigation"
					title="Open site navigation"
				>
					<i className="hn hn-bars" aria-hidden="true" />
				</Menu.Trigger>
				<Menu.Portal>
					<Menu.Positioner
						className="site-navigation-positioner"
						positionMethod="fixed"
						side="bottom"
						align="end"
						sideOffset={8}
						collisionPadding={16}
					>
						<Menu.Popup className="site-navigation-popup">
							{NAVIGATION_ITEMS.map((item) => {
								const active =
									item.to === "/"
										? pathname === item.to
										: pathname === item.to ||
											pathname.startsWith(`${item.to}/`);

								return (
									<Menu.LinkItem
										key={item.to}
										className="site-navigation-item"
										closeOnClick
										render={<Link to={item.to} preload="intent" />}
										aria-current={active ? "page" : undefined}
									>
										<span>{item.label}</span>
										{active && (
											<span
												className="site-navigation-active-mark"
												aria-hidden="true"
											/>
										)}
									</Menu.LinkItem>
								);
							})}
							<ThemeToggle />
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>
		</nav>
	);
};

export { SiteNavigation };
