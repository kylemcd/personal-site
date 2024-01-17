import { ArrowUpRight } from 'lucide-react';
const Hero = () => {
    return (
        <div className="w-full">
            <div className="overflow-hidden [font-stretch:100%] [text-size-adjust:100%] [container-type:inline-size] w-full md:mb-8">
                <h1 className="text-accent text-[10.1cqmin] [width:max-content] [contain:layout] block leading-none [font-stretch:100%] [box-sizing:content-box] [background-clip:content-box]">
                    Hi, I'm Kyle McDonald
                </h1>
            </div>
            <div className="flex flex-col md:flex-row justify-between md:items-center pt-10 px-2 gap-4">
                <div className="basis-full md:basis-1/3">
                    <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-[130px_100%]">
                            <a
                                href="https://knock.app"
                                target="_blank"
                                className="text-accent text-lg hover:no-underline group"
                            >
                                <span className="flex items-center gap-1">
                                    <span>Knock</span>
                                    <ArrowUpRight
                                        className="inline-block stroke-accent group-hover:translate-x-[2px] group-hover:-translate-y-[2px] transition-transform"
                                        size={16}
                                    />
                                </span>
                            </a>
                            <div>
                                <span className="text-gray-12 block text-md">Software Engineer</span>
                                <span className="text-gray-11 block text-xs">2024-Present</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-[130px_100%]">
                            <a href="https://foxtrotco.com" target="_blank" className="text-accent text-lg">
                                <span className="flex items-center gap-1">
                                    <span>Foxtrot</span>
                                    <ArrowUpRight
                                        size={16}
                                        className="inline-block stroke-accent group-hover:translate-x-[2px] group-hover:-translate-y-[2px] transition-transform"
                                    />
                                </span>
                            </a>
                            <div>
                                <span className="text-gray-12 block text-md">Director of Engineering</span>
                                <span className="text-gray-11 block text-xs">2019-2023</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-[130px_100%]">
                            <a href="https://designory.com" target="_blank" className="text-accent text-lg">
                                <span className="flex items-center gap-1">
                                    <span>Designory</span>
                                    <ArrowUpRight
                                        size={16}
                                        className="inline-block stroke-accent group-hover:translate-x-[2px] group-hover:-translate-y-[2px] transition-transform"
                                    />
                                </span>
                            </a>
                            <div>
                                <span className="text-gray-12 block text-md">Software Engineer</span>
                                <span className="text-gray-11 block text-xs">2017-2019</span>
                            </div>
                        </div>
                    </div>
                </div>
                <p className="text-gray-11 text-lg leading-relaxed basis-full md:basis-2/3">
                    My passion lies in crafting visually stunning front-end interfaces with React and pushing the limits
                    of what can be achieved. I also have a knack for leadership, process development, and shipping
                    top-notch software with my team. When I'm not busy coding, you'll find me hanging out with my pup
                    Wallie, cruising around the city on my bike, playing an egregious amount of Hell Let Loose, or
                    indulging in my latest interest, which is currently tinkering with mechanical keyboards.
                </p>
            </div>
        </div>
    );
};

export default Hero;
