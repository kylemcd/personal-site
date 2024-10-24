import { Card } from '@/components/lib/Card';

const HomeCards = () => {
    return (
        <div className="home-cards">
            <Card>
                <h1>Card 1</h1>
                <p>Card 1 content</p>
            </Card>
            <Card>
                <h1>Card 2</h1>
                <p>Card 2 content</p>
            </Card>
        </div>
    );
};
export { HomeCards };
