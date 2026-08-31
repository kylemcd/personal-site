type ExperienceLogoName = "designory" | "foxtrot" | "knock";

type RasterExperienceLogoName = Exclude<ExperienceLogoName, "knock">;

type ExperienceLogoProps = {
	name: ExperienceLogoName;
};

const KnockLogo = () => {
	return (
		<>
			<path
				className="experience-logo-mark"
				d="M29 19h13v35l14-18h14L55 55l16 26H57L47 63l-5 6v12H29Z"
			/>
			<circle className="experience-logo-accent" cx="64" cy="26" r="7" />
		</>
	);
};

const RASTER_LOGO_SOURCES: Record<
	RasterExperienceLogoName,
	{ dark: string; light: string }
> = {
	designory: {
		dark: "/images/experience/designory-light.png",
		light: "/images/experience/designory-light.png",
	},
	foxtrot: {
		dark: "/images/experience/foxtrot-dark.png",
		light: "/images/experience/foxtrot-light.png",
	},
};

const RasterExperienceLogo = ({ name }: { name: RasterExperienceLogoName }) => {
	const sources = RASTER_LOGO_SOURCES[name];

	return (
		<span className="experience-logo experience-logo-raster" data-logo={name}>
			<img
				alt=""
				className="experience-logo-image experience-logo-image-light"
				src={sources.light}
			/>
			<img
				alt=""
				className="experience-logo-image experience-logo-image-dark"
				src={sources.dark}
			/>
		</span>
	);
};

const ExperienceLogo = ({ name }: ExperienceLogoProps) => {
	if (name !== "knock") {
		return <RasterExperienceLogo name={name} />;
	}

	return (
		<svg
			aria-hidden="true"
			className="experience-logo"
			data-logo={name}
			focusable="false"
			viewBox="0 0 100 100"
		>
			<rect className="experience-logo-background" width="100" height="100" />
			<KnockLogo />
		</svg>
	);
};

export type { ExperienceLogoName };
export { ExperienceLogo };
