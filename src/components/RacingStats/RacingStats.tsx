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
                <div className="recent-races">
                    {races.map((race) => {
                        return (
                            <div key={race.subsession_id} className="race-item">
                                <Text size="0">{race.track.track_name}</Text>
                                <div className="race-item-info">
                                    <Text size="0" color="gray">
                                        {race.car.car_name}
                                    </Text>
                                    <div className="position-change">
                                        <div className="position-stack">
                                            <div className="position-number">
                                                <Text size="0" align="right" weight="500" color="gray">
                                                    {race.finish_position}
                                                </Text>
                                            </div>
                                        </div>
                                    </div>
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
