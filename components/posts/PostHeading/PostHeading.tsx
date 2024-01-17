'use client';
import useCSSVariableObserver from '@/hooks/useCSSVariableObserver';
import { hslToHex, pickFontColorBasedonBackgroundColor } from '@/helpers/colorHelper';
import { HSLString, HexString, isHSLString } from '@/types/colors';

type PostHeadingProps = {
    post: {
        title: string;
        date: string;
        readingTime: {
            text: string;
        };
    };
};

const PostHeading = ({ post }: PostHeadingProps) => {
    const color = useCSSVariableObserver('--primary-color');

    const calculateFontColor = (color: HSLString | HexString) => {
        let backgroundColor = color;
        if (isHSLString(backgroundColor)) {
            backgroundColor = hslToHex(backgroundColor);
        }
        return pickFontColorBasedonBackgroundColor(backgroundColor, '#ffffff', '#000000');
    };

    return (
        <div className="max-w-[900px] mx-auto flex flex-col gap-4 my-10">
            <h1 className="text-accent text-4xl leading-tight">{post.title}</h1>
            <span className="text-gray-11 font-mono text-sm">
                {String(
                    new Date(post.date).toLocaleDateString('en-us', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    })
                )}
                &nbsp;&nbsp;//&nbsp;&nbsp;
                {post.readingTime.text}
            </span>
        </div>
    );
};

export { PostHeading };
