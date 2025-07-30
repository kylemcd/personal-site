import { Text } from '@/components/Text';
import { IRacingCar, RaceSchema } from '@/lib/iracing/schema';

import './RacingStats.styles.css';

type RacingStatsProps = {
    races: ReadonlyArray<
        typeof RaceSchema.Type & {
            car: typeof IRacingCar.Type;
        }
    >;
};

function RacingStats({ races }: RacingStatsProps) {
    return (
        <div>
            {races.length > 0 && (
                <div className="list">
                    {races.map((race) => {
                        return (
                            <div key={race.subsession_id} className="list-item race-item">
                                <div className="race-item-info">
                                    <Text size="1" className="race-item-track">
                                        {race.track.track_name}
                                    </Text>
                                    <Text size="0" color="2" className="race-item-car">
                                        {race.car.car_name}
                                    </Text>
                                </div>
                                <div className="race-item-position" data-position={race.finish_position}>
                                    <Text size="0" align="right" weight="500" color="light">
                                        {race.finish_position}
                                    </Text>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export { RacingStats };
