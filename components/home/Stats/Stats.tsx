import { RawDataFromAirtable } from '@/types/stats';
import { statsTranformer } from '@/helpers/dataHelper';

const Stats = ({ stats }: { stats: RawDataFromAirtable }) => {
    const formattedStats = statsTranformer({ stats });
    return <div>{JSON.stringify(formattedStats)}</div>;
};

export default Stats;
