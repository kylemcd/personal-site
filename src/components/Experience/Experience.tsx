import { Text } from "@/components/Text";

import "./Experience.styles.css";

type Job = {
	company: string;
	href: string;
	title: string;
	years: string;
};

const JOBS: ReadonlyArray<Job> = [
	{
		company: "Knock",
		href: "https://knock.app",
		title: "Software Engineer",
		years: "2023 - ____",
	},
	{
		company: "Foxtrot",
		href: "https://foxtrotco.com",
		title: "Director of Engineering",
		years: "2019 - 2023",
	},
	{
		company: "Designory",
		href: "https://designory.com",
		title: "Software Engineer",
		years: "2017 - 2019",
	},
];

function Experience() {
	return (
		<ul className="experience-list">
			{JOBS.map((job) => (
				<li className="experience-list-item" key={job.company}>
					<div className="experience-list-item-link-container">
						<Text
							as="a"
							href={job.href}
							target="_blank"
							size="1"
							className="experience-list-item-link"
						>
							{job.company}
						</Text>
						<Text
							as="i"
							size="0"
							color="3"
							className="hn hn-external-link"
							aria-hidden="true"
						/>
					</div>
					<div className="experience-list-item-info">
						<Text as="span" color="2" size="0">
							{job.title}
						</Text>
						<Text
							as="span"
							size="0"
							color="2"
							family="mono"
							className="experience-list-item-info-date"
						>
							{job.years}
						</Text>
					</div>
				</li>
			))}
		</ul>
	);
}

export { Experience };
