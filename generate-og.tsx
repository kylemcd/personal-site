import { readFileSync, writeFileSync } from 'fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { getAllPosts } from './helpers/posts';

const OgComponent = ({ title }: { title: string }) => {
    return (
        <div
            style={{
                background: 'white',
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                flexDirection: 'column',
                fontFamily: 'Inter',
            }}
        >
            <img
                src="https://github.com/kylemcd/personal-site/assets/29106675/87f24255-9c14-42df-a7f7-2a2dbd1b95e5"
                alt="background"
                width="1200"
                height="600"
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            />
            <div
                style={{
                    display: 'flex',
                    width: '100%',
                    padding: '64px 72px',
                    alignItems: 'center',
                    flexGrow: 1,
                }}
            >
                <div
                    style={{
                        color: 'white',
                        fontSize: '64px',
                        fontFamily: 'Playfair',
                        fontWeight: 600,
                        display: 'flex',
                        maxWidth: '70%',
                        width: '100%',
                        textShadow: '0px 0px 20px rgba(25,90,230,0.5)',
                    }}
                >
                    {title}
                </div>
            </div>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        boxShadow: '0px 0px 30px 15px rgba(255,255,255,0.2)',
                        borderTop: '1px solid rgba(255,255,255,0.2)',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        filter: 'blur(1px)',
                    }}
                />
                <div style={{ display: 'flex', alignItems: 'center', padding: '36px 72px' }}>
                    <img
                        src="https://github.com/kylemcd/personal-site/assets/29106675/1c569d73-1bb7-4b66-95f3-1547d6823e0a"
                        alt="avatar"
                        width="90"
                        height="90"
                        style={{
                            borderRadius: 90,
                            border: '1px solid rgba(255,255,255,0.2)',
                        }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span
                            style={{
                                color: 'white',
                                fontSize: '28px',
                                marginLeft: '24px',
                                fontFamily: 'Inter',
                                fontWeight: 400,
                                textShadow: '0px 0px 20px rgba(25,90,230,0.5)',
                            }}
                        >
                            Kyle McDonald
                        </span>
                        <span
                            style={{
                                color: 'white',
                                fontSize: '20px',
                                marginLeft: '24px',
                                fontFamily: 'Inter',
                                textShadow: '0px 0px 20px rgba(25,90,230,0.5)',
                                fontWeight: 300,
                            }}
                        >
                            Software Engineer
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const constructImage = async ({ title, path }: { title: string; path: string }) => {
    const svg = await satori(<OgComponent title={title} />, {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        // Provide the correct font(s) your component needs
        fonts: [
            {
                name: 'Inter',
                data: readFileSync('./og/Inter-Light.woff'),
                weight: 300,
                style: 'normal',
            },
            {
                name: 'Inter',
                data: readFileSync('./og/Inter-Medium.woff'),
                weight: 400,
                style: 'normal',
            },
        ],
    });

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } });
    const pngData = resvg.render().asPng();

    writeFileSync(`public/og/${path}.png`, pngData);
};

async function generateImage() {
    const posts = await getAllPosts();

    posts.forEach(async (post) => {
        await constructImage({
            title: post.title,
            path: post.slug,
        });
    });

    await constructImage({
        title: "Kyle McDonald's Personal Site",
        path: '/home',
    });
}

generateImage();
