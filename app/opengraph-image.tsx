import { ImageResponse } from 'next/og';
// Route segment config
export const runtime = 'edge';

// Image metadata
const size = {
    width: 1200,
    height: 630,
};

export default async function Image() {
    const interMedium = fetch(new URL('../og/Inter-Medium.ttf', import.meta.url)).then((res) => res.arrayBuffer());
    const interLight = fetch(new URL('../og/Inter-Light.ttf', import.meta.url)).then((res) => res.arrayBuffer());
    const playFairBold = fetch(new URL('../og/PlayfairDisplay-Bold.ttf', import.meta.url)).then((res) =>
        res.arrayBuffer()
    );
    const title = "Kyle McDonald's Personal Site";

    return new ImageResponse(
        (
            // ImageResponse JSX element
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
                                Director of Engineering @ Foxtrot
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        ),
        {
            // For convenience, we can re-use the exported opengraph-image
            // size config to also set the ImageResponse's width and height.
            width: 1200,
            height: 630,
            fonts: [
                {
                    name: 'Inter',
                    data: await interLight,
                    style: 'normal',
                    weight: 300,
                },
                {
                    name: 'Inter',
                    data: await interMedium,
                    style: 'normal',
                    weight: 400,
                },
                {
                    name: 'Playfair',
                    data: await playFairBold,
                    style: 'normal',
                    weight: 600,
                },
            ],
        }
    );
}
