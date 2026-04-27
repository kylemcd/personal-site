import { Text } from "@/components/Text";

import "./HomeHero.styles.css";

function HomeHero() {
	return (
		<div className="home-hero">
			<div className="home-hero-image-container">
				<img
					src="/images/ascii-picture.png"
					alt="Kyle"
					className="home-hero-ascii-image"
				/>
				<img
					src="/images/full-picture.png"
					alt="Kyle"
					className="home-hero-full-image"
				/>
			</div>
			<div className="home-hero-text-container">
				<Text as="p" size="1">
					Hey, I'm Kyle and I like building things. Whether it’s front-end
					interfaces, developer tools, or the perfect iRacing setup. I spend
					most of my time working with React, making software feel fast and
					seamless, and obsessing over the little details that make a great user
					experience. I also care a lot about good keyboard shortcuts and not
					making people fight with their tools.
					<br />
					<br />
					When I’m not deep in code, I’m probably chasing lap times in iRacing,
					watching F1 and convincing myself I could totally be an engineer for
					Red Bull, or tweaking setups until I forget what “optimal” even looks
					like. Off the track, I spend a lot of time biking through the city,
					tinkering with mechanical keyboards, and hanging out with my dog,
					Wallie, who has no idea what I do all day but is very supportive.
				</Text>
			</div>
		</div>
	);
}

export { HomeHero };
