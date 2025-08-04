import { Resvg } from '@resvg/resvg-js';
import { Effect, Exit } from 'effect';
import { readFileSync, writeFileSync } from 'fs';
import satori from 'satori';

import { markdown } from '@/lib/markdown';

const colors = {
    bg1: 'rgb(16, 15, 15)',
    bg2: 'rgb(28, 27, 26)',
    text1: 'rgb(206, 205, 195)',
    text2: 'rgb(135, 133, 128)',
    text3: 'rgb(87, 86, 83)',
    ui1: 'rgb(40, 39, 38)',
    ui2: 'rgb(52, 51, 49)',
    ui3: 'rgb(64, 62, 60)',
};

const OgComponent = ({ title }: { title: string }) => {
    return (
        <div
            style={{
                background: colors.bg2,
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                flexDirection: 'column',
                fontFamily: 'Inter',
            }}
        >
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
                        color: colors.text1,
                        fontSize: '64px',
                        fontFamily: 'Inter',
                        fontWeight: 400,
                        display: 'flex',
                        maxWidth: '70%',
                        width: '100%',
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
                    background: colors.bg1,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '36px 72px',
                        borderTop: `1px solid ${colors.ui1}`,
                        width: '100%',
                    }}
                >
                    <img
                        src="https://kylemcd.com/avatar.png"
                        alt="avatar"
                        style={{
                            border: '1px solid rgba(255,255,255,0.2)',
                            width: '90px',
                            height: '90px',
                        }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span
                            style={{
                                color: colors.text1,
                                fontSize: '28px',
                                marginLeft: '24px',
                                fontFamily: 'Inter',
                                fontWeight: 400,
                            }}
                        >
                            Kyle McDonald
                        </span>
                        <span
                            style={{
                                color: colors.text2,
                                fontSize: '20px',
                                marginLeft: '24px',
                                fontFamily: 'Inter',
                                fontWeight: 400,
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
        fonts: [
            {
                name: 'Inter',
                data: readFileSync('./public/fonts/opengraph-inter-light.woff'),
                weight: 300,
                style: 'normal',
            },
            {
                name: 'Inter',
                data: readFileSync('./public/fonts/opengraph-inter-medium.woff'),
                weight: 400,
                style: 'normal',
            },
        ],
    });

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } });
    const pngData = resvg.render().asPng();

    writeFileSync(`public/open-graph/${path}.png`, pngData);
};

async function generateImage() {
    const response = Effect.runSyncExit(markdown.all());

    if (Exit.isFailure(response)) {
        throw response;
    }

    const posts = response.value;

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
