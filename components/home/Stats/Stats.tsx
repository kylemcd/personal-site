import { FormattedStats } from '@/types/stats';
import { ErrorResponse } from '@/types/global';

const Stats = ({ stats }: { stats: FormattedStats | ErrorResponse }) => {
    return <div>{JSON.stringify(stats)}</div>;
};

export default Stats;
