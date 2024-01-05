'use client';
import React from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useTransform, useMotionValueEvent } from 'framer-motion';
// import { use3DHover } from '@/hooks/use3DHover';
//

type CardProps = {
    rotationMultiplier?: number;
    aspect: 'rect' | 'square';
};

function Card({ rotationMultiplier = 3, aspect }: CardProps) {
    const cardRef = React.useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const shadowX = useMotionValue<number | null>(null);
    const shadowY = useMotionValue<number | null>(null);

    const rotateX = useTransform(() => mouseY.get());
    const rotateY = useTransform(() => -mouseX.get());
    const boxShadow = useTransform(() => {
        if (shadowX.get() === null || shadowY.get() === null) return '0 0 0 0 rgba(0,0,0,0)';
        return `${shadowX.get()}px ${shadowY.get()}px 10px 8px rgba(239,239,240,0.6)`;
    });

    function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
        const card = cardRef.current;
        if (!card) return;
        const width = card.offsetWidth;
        const height = card.offsetHeight;
        const mouse = { x: event.clientX, y: event.clientY };

        const rotateX = (mouse.x - width / 2) / width;
        const rotateY = (mouse.y - height / 2) / height;

        const relativeMouse = { x: event.clientX - card.offsetLeft, y: event.clientY - card.offsetTop };

        const mouseFromCenter = { x: relativeMouse.x - width / 2, y: relativeMouse.y - height / 2 };
        const normalizedMouse = { x: mouseFromCenter.x / width, y: mouseFromCenter.y / height };

        mouseX.set(rotateX * rotationMultiplier);
        mouseY.set(rotateY * rotationMultiplier);
        const shadow = { x: normalizedMouse.x * 5, y: normalizedMouse.y * 1 };

        shadowX.set(shadow.x > 8 ? 8 : shadow.x < -8 ? -8 : shadow.x);
        shadowY.set(shadow.y > 8 ? 8 : shadow.y < -8 ? -8 : shadow.y);
    }

    const cardVariants = {
        initial: {
            borderRadius: '0',
            boxShadow: '0 0 0 0 rgba(239,239,240, 0.0)',
            scale: 1,
        },
        hover: {
            borderRadius: '0.75rem',
            scale: 1.05,
            width: aspect === 'square' ? '200%' : '100%',
            aspectRatio: 'auto',
            zIndex: 5,
        },
    };

    const contentVariants = {
        initial: {
            width: '100%',
        },
        hover: {
            width: '50%',
        },
    };

    const extraContentVariants = {
        initial: {
            opacity: 0,
            display: 'none',
        },
        hover: {
            opacity: 1,
            display: 'flex',
        },
    };

    return (
        <motion.div
            className={[
                'relative w-full h-full',
                aspect === 'square' ? 'aspect-square [grid-column:span_1]' : 'aspect-[2/1] [grid-column:span_2]',
            ].join(' ')}
            initial="initial"
            whileHover="hover"
            ref={cardRef}
            onMouseMove={handleMouseMove}
        >
            <motion.div
                variants={cardVariants}
                style={{
                    rotateX: rotateX,
                    rotateY: rotateY,
                    boxShadow: boxShadow,
                    borderRadius: '0',
                    scale: 1,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: '100%',
                    // aspectRatio: '1/1',
                    perspective: '1000px',
                }}
                transition={{
                    boxShadow: { duration: 0.2, ease: 'easeInOut' },
                    width: { duration: 0 },
                }}
                onHoverEnd={() => {
                    mouseX.set(0);
                    mouseY.set(0);
                    shadowX.set(null);
                    shadowY.set(null);
                }}
                className={[
                    'bg-gray-1 border border-gray-3 flex flex-col  rounded-none transform-gpu',
                    // aspect === 'square' ? 'aspect-square' : 'aspect-[2/1]',
                ].join(' ')}
            >
                <div className="flex  justify-between w-full h-full p-8 gap-8">
                    <motion.div
                        variants={contentVariants}
                        className="flex flex-col h-full"
                        transition={{
                            width: { duration: 0 },
                        }}
                    >
                        <div className="flex flex-row gap-8 items-center w-full h-full">
                            <Image
                                src="https://assets.literal.club/cover/2/clqazid6r14625800hi5owqe78uk.jpg?size=800"
                                alt="Book"
                                className="w-[30%] h-auto shadow-sm rounded-md"
                                width={324}
                                height={500}
                            />
                            <div className="flex flex-col justify-between">
                                <span className="font-sans text-lg">Burn Rate</span>
                                <span className="font-sans text-lg text-gray-11"> Andy Dunn</span>
                            </div>
                        </div>
                        <h3 className="text-sm font-mono uppercase text-gray-10 mt-auto">Currently Reading</h3>
                    </motion.div>
                    <motion.div
                        variants={extraContentVariants}
                        transition={{ duration: 0 }}
                        className="flex flex-col h-full gap-2 w-[50%]"
                    >
                        <ul className="list-none flex flex-col gap-2 mt-auto">
                            <li className="flex flex-col">
                                <span className="text-md">Shoe Dog</span>
                                <span className="text-sm text-gray-11">Phil Knight</span>
                            </li>
                            <li className="flex flex-col">
                                <span className="text-md">An Elegant Puzzle</span>
                                <span className="text-sm text-gray-11">Will Larson</span>
                            </li>
                            <li className="flex flex-col">
                                <span className="text-md">The Messy Middle</span>
                                <span className="text-sm text-gray-11">Scott Belsky</span>
                            </li>
                        </ul>
                        <h3 className="text-sm font-mono uppercase text-gray-10 mt-auto">Recently Read</h3>
                    </motion.div>
                </div>
            </motion.div>
        </motion.div>
    );
}

function ActivityCloud() {
    return (
        <div className="grid grid-cols-3 grid-rows-2">
            <Card aspect="square" />
            <div className="w-full h-full [grid-column:span_2] gap-8 border-gray-3 border" />
            <div className="w-full h-full [grid-column:span_2] gap-8 border-gray-3 border" />
            <div className="w-full h-full [grid-column:span_1] gap-8 border-gray-3 border" />
        </div>
    );
}

export { ActivityCloud };
