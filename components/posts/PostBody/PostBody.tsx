'use client';
import { useEffect, useState, useRef } from 'react';
import slugify from 'slugify';

import { Paragraph } from '@/components/global/Typography';
import { usePathname } from 'next/navigation';

import { IBM_Plex_Serif } from 'next/font/google';
const merriweather = IBM_Plex_Serif({ subsets: ['latin'], weight: '400' });
import styles from './PostBody.module.css';
import { initialize } from 'next/dist/server/lib/render-server';

interface NavLink {
    name: string;
    slug: string;
}
const PostBody = ({ htmlBody }: { htmlBody: string }) => {
    const navLinksRef = useRef<HTMLUListElement>(null);
    const [navLinks, setNavLinks] = useState<NavLink[]>([]);
    const [parsedHtmlBody, setParsedHtmlBody] = useState('');
    const [initialScroll, setInitialScroll] = useState(false);

    const compileLinks = ({ htmlBody }: { htmlBody: string }) => {
        const parser = new DOMParser();

        const parsedBody = parser.parseFromString(htmlBody, 'text/html');
        const headingElements = parsedBody.querySelectorAll('h1, h2, h3');

        const navLinks: NavLink[] = [];

        headingElements.forEach((heading, index) => {
            if (heading) {
                const name = heading?.textContent!;
                const slug = slugify(`${name.toLowerCase()} ${index}`);

                heading.setAttribute('id', slug);
                navLinks.push({
                    name,
                    slug,
                });
            }
        });

        if (parsedBody?.body?.innerHTML) {
            setParsedHtmlBody(parsedBody.body.innerHTML);
        }

        if (navLinks) {
            setNavLinks(navLinks);
        }
    };

    // This is hacky but it works for now, need to address the fact that the markup isn't being server
    // rendered and then I can remove this
    const getElementByIdAsync = (id: string): any =>
        new Promise((resolve) => {
            const getElement = () => {
                const element = document.getElementById(id);
                if (element) {
                    resolve(element);
                } else {
                    requestAnimationFrame(getElement);
                }
            };
            getElement();
        });

    const scrollToPathnameLink = async () => {
        const pathnamePoundString = window.location.hash;

        if (pathnamePoundString) {
            const element = await getElementByIdAsync(`${pathnamePoundString.replace('#', '')}`);
            console.log('pathname', element);
            if (element) {
                console.log('scroll element', element);
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setInitialScroll(true);
            }
        }
    };

    const makeLinksScrollBetter = () => {
        if (navLinksRef.current) {
            const links = navLinksRef.current.querySelectorAll('a');

            links.forEach((link) => {
                link.addEventListener('click', (event) => {
                    event.preventDefault();
                    const href = link.getAttribute('href');
                    const element = document.querySelector(href!);
                    if (!element) return;

                    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            });
        }
    };

    useEffect(() => {
        compileLinks({ htmlBody });
        if (!initialScroll) {
            scrollToPathnameLink();
        }
    }, [htmlBody, initialScroll]);

    useEffect(() => {
        makeLinksScrollBetter();
    }, [navLinks]);

    return (
        <div className={styles.container}>
            <div className={styles.sideNavContainer}>
                <div className={styles.sideNav}>
                    {navLinks?.length > 0 && (
                        <>
                            <Paragraph size="md" color="--primary-font-color">
                                Quick Navigate
                            </Paragraph>
                            <ul className={styles.sideNavList}>
                                {navLinks.map((navLink) => (
                                    <li className={styles.sideNavListItem} key={navLink.slug}>
                                        <a href={`#${navLink.slug}`}>
                                            <Paragraph size="sm" color="--primary-color">
                                                {navLink.name}
                                            </Paragraph>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            </div>
            <div
                className={`${styles.postStyles} ${merriweather.className}`}
                dangerouslySetInnerHTML={{ __html: parsedHtmlBody }}
            />
        </div>
    );
};

export default PostBody;
