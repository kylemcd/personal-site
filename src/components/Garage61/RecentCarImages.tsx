import { useState } from "react";

import { Text } from "@/components/Text";
import { formatDuration } from "@/lib/format";
import type { Garage61Summary } from "@/lib/garage61/schema";
import { getRacingCarImagePath } from "@/lib/racing-media/car-images";

type RecentCar = Garage61Summary["derived"]["overview"]["recentCars"][number];

const RecentCarImage = ({ car }: { car: RecentCar }) => {
	const [imageUnavailable, setImageUnavailable] = useState(false);
	const imagePath = getRacingCarImagePath(car.platformId);

	return (
		<article className="g61-racing-car-image-item">
			<div className="g61-racing-car-image-visual">
				{imagePath && !imageUnavailable ? (
					<img
						className="g61-racing-car-image"
						src={imagePath}
						alt={`${car.name} racing livery`}
						loading="lazy"
						decoding="async"
						onError={() => setImageUnavailable(true)}
					/>
				) : (
					<Text as="p" size="0" color="2">
						Image unavailable
					</Text>
				)}
			</div>
			<div className="g61-racing-car-image-copy">
				<Text as="p" size="1">
					{car.name}
				</Text>
				<Text as="p" size="0" color="2" family="tabular">
					{formatDuration(car.timeOnTrackSeconds)}
				</Text>
			</div>
		</article>
	);
};

const RecentCarImages = ({ cars }: { cars: ReadonlyArray<RecentCar> }) => {
	return (
		<div className="g61-racing-car-image-grid">
			{cars.map((car) => (
				<RecentCarImage car={car} key={`${car.id}-${car.name}`} />
			))}
		</div>
	);
};

export { RecentCarImages };
