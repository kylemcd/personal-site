'use client';
import React from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useTransform } from 'framer-motion';

type ActivityCloudItemProps = {
    rotationMultiplier?: number;
    Content?: () => React.ReactNode;
    ExpandedContent?: () => React.ReactNode;
};

const MOBILE_BREAKPOINT = 768;

function ActivityCloudItem({ rotationMultiplier = 3, Content, ExpandedContent }: ActivityCloudItemProps) {
    const cardRef = React.useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const shadowX = useMotionValue<number | null>(null);
    const shadowY = useMotionValue<number | null>(null);
    const [positioning, setPositioning] = React.useState({});
    const [isActive, setIsActive] = React.useState(false);
    const [windowWidth, setWindowWidth] = React.useState<number>(0);

    const rotateX = useTransform(() => mouseY.get());
    const rotateY = useTransform(() => -mouseX.get());
    const boxShadow = useTransform(() => {
        if (shadowX.get() === null || shadowY.get() === null) return '0 0 0 0 rgba(0,0,0,0)';
        return `${shadowX.get()}px ${shadowY.get()}px 10px 8px rgba(239,239,240,0.6)`;
    });

    function calculatePositioning(): React.CSSProperties {
        const card = cardRef.current;
        if (!card) return {};

        const windowWidth = window.innerWidth;
        const cardWidth = card.offsetWidth;
        const cardHorizontalOffset = card.offsetLeft;
        const totalCardWidthRight = cardWidth * 2 + cardHorizontalOffset;

        if (windowWidth < 768) {
            return {
                top: 0,
                left: 0,
                flexDirection: 'column',
            };
        }

        if (totalCardWidthRight > windowWidth) {
            return {
                left: 'auto',
                right: 0,
                top: 0,
                flexDirection: 'row-reverse',
            };
        }

        return {
            left: 0,
            top: 0,
        };
    }

    React.useLayoutEffect(() => {
        setWindowWidth(window.innerWidth);
        setPositioning(calculatePositioning());
    }, []);

    function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
        const card = cardRef.current;
        if (!card || window.innerWidth < MOBILE_BREAKPOINT) return;
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

    const mobileCardVariants = {
        initial: {
            boxShadow: '0 0 0 0 rgba(239,239,240, 0.0)',
            scale: 1,
        },
        hover: {
            boxShadow: '0 0 0 0 rgba(239,239,240, 0.0)',
            scale: 1,
        },
    };

    const desktopCardVariants = {
        initial: {
            boxShadow: '0 0 0 0 rgba(239,239,240, 0.0)',
            width: '100%',
            scale: 1,
        },
        hover: {
            scale: 1.05,
            width: '200%',
            zIndex: 5,
        },
    };

    const mobileContentVariants = {
        initial: {
            flexBasis: '100%',
            display: isActive ? 'none' : 'flex',
        },
        hover: {
            flexBasis: '100%',
            display: isActive ? 'none' : 'flex',
        },
    };

    const desktopContentVariants = {
        initial: {
            flexBasis: '100%',
            display: 'flex',
        },
        hover: {
            flexBasis: '50%',
            display: 'flex',
        },
    };

    const mobileExtraContentVariants = {
        initial: {
            opacity: isActive ? 1 : 0,
            display: isActive ? 'flex' : 'none',
        },
        hover: {
            opacity: isActive ? 1 : 0,
            display: isActive ? 'flex' : 'none',
        },
    };

    const desktopExtraContentVariants = {
        initial: {
            opacity: 0,
            display: 'none',
            flexBasis: '50%',
        },
        hover: {
            opacity: 1,
            display: 'flex',
            flexBasis: '50%',
        },
    };

    return (
        <motion.div
            className={['relative w-full h-full aspect-square [grid_column:span_1] '].join(' ')}
            ref={cardRef}
            key={isActive.toString()}
            initial="initial"
            whileHover="hover"
            onMouseMove={(event) => {
                if (windowWidth < MOBILE_BREAKPOINT) return;
                handleMouseMove(event);
            }}
            onHoverEnd={() => {
                rotateY.set(0);
                rotateX.set(0);
                boxShadow.set('0 0 0 0 rgba(0,0,0,0)');
            }}
        >
            <motion.div
                variants={windowWidth < MOBILE_BREAKPOINT ? mobileCardVariants : desktopCardVariants}
                onClick={() => {
                    if (windowWidth > MOBILE_BREAKPOINT) return;
                    setIsActive(!isActive);
                }}
                style={{
                    rotateX: rotateX,
                    rotateY: rotateY,
                    boxShadow: boxShadow,
                    scale: 1,
                    position: 'absolute',
                    height: '100%',
                    width: '100%',
                    perspective: '1000px',
                    flexDirection: 'row',
                    flexBasis: '100%',
                    ...positioning,
                }}
                transition={{
                    boxShadow: { duration: 0.2, ease: 'easeInOut' },
                    width: { duration: 0 },
                    scale: { duration: 0.1, type: 'spring', bounce: 1, stiffness: 90, damping: 10 },
                }}
                className={['bg-gray-1 flex rounded-2xl transform-gpu justify-between p-8 gap-16 h-full'].join(' ')}
            >
                <motion.div
                    variants={windowWidth < MOBILE_BREAKPOINT ? mobileContentVariants : desktopContentVariants}
                    className="aspect-square"
                    transition={{
                        width: { duration: 0 },
                    }}
                    style={{ flexBasis: '100%' }}
                >
                    {Content && <Content />}
                </motion.div>
                <motion.div
                    variants={
                        windowWidth < MOBILE_BREAKPOINT ? mobileExtraContentVariants : desktopExtraContentVariants
                    }
                    transition={{ duration: 0 }}
                    style={{ flexBasis: '50%' }}
                    className="flex aspect-square"
                >
                    {ExpandedContent && <ExpandedContent />}
                </motion.div>
            </motion.div>
        </motion.div>
    );
}

export { ActivityCloudItem };
