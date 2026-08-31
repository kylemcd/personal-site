import { Text } from "@/components/Text";

import { ExperienceLogo, type ExperienceLogoName } from "./ExperienceLogo";
import "./Experience.styles.css";

type Job = {
	company: string;
	href: string;
	logo: ExperienceLogoName;
	title: string;
};

const CURRENT_JOBS: ReadonlyArray<Job> = [
	{
		company: "Knock",
		href: "https://knock.app",
		logo: "knock",
		title: "Product Engineer",
	},
];

const PAST_JOBS: ReadonlyArray<Job> = [
	{
		company: "Foxtrot",
		href: "https://foxtrotco.com",
		logo: "foxtrot",
		title: "Director of Engineering",
	},
	{
		company: "Designory",
		href: "https://designory.com",
		logo: "designory",
		title: "Software Engineer",
	},
];

type ExperienceGroupProps = {
	jobs: ReadonlyArray<Job>;
	label: string;
};

const ExperienceGroup = ({ jobs, label }: ExperienceGroupProps) => {
	return (
		<div className="experience-group">
			<Text as="p" size="0" color="2" weight="500">
				{label}
			</Text>
			<ul className="experience-list">
				{jobs.map((job) => (
					<li className="experience-list-item" key={job.company}>
						<span className="experience-list-item-logo" aria-hidden="true">
							<ExperienceLogo name={job.logo} />
						</span>
						<span className="experience-list-item-copy">
							<Text as="span" size="1">
								{job.title},
							</Text>
							<Text
								as="a"
								href={job.href}
								target="_blank"
								rel="noreferrer"
								size="1"
								className="experience-list-item-link"
							>
								{job.company}
							</Text>
						</span>
					</li>
				))}
			</ul>
		</div>
	);
};

const Experience = () => {
	return (
		<div className="experience-groups">
			<ExperienceGroup label="Current" jobs={CURRENT_JOBS} />
			<ExperienceGroup label="Past" jobs={PAST_JOBS} />
		</div>
	);
};

export { Experience };
