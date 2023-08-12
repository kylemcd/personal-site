'use client'
import { useEffect, useState } from 'react';
import slugify from 'slugify';

import { Paragraph } from '@/components/global/Typography';

import styles from './PostBody.module.css';

interface NavLink {
    name: string;
    slug: string;
}
const PostBody = ({ htmlBody }: { htmlBody: string }) => {
    const [navLinks, setNavLinks] = useState<NavLink[]>([]);
    const [parsedHtmlBody, setParsedHtmlBody] = useState('');

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
    useEffect(() => {
        compileLinks({ htmlBody });
    }, [htmlBody]);

    return (
        <div className={styles.container}>
            <div className={styles.sideNavContainer}>
                <div className={styles.sideNav}>
                    <Paragraph size="md" color="--primary-font-color">
                        Quick Navigate
                    </Paragraph>
                    <ul className={styles.sideNavList}>
                        {navLinks?.length > 0 &&
                            navLinks.map((navLink) => (
                                <li className={styles.sideNavListItem} key={navLink.slug}>
                                    <a href={`#${navLink.slug}`}>
                                        <Paragraph size="sm" color="--primary-color">
                                            {navLink.name}
                                        </Paragraph>
                                    </a>
                                </li>
                            ))}
                    </ul>
                </div>
            </div>
            <div className={styles.postStyles} dangerouslySetInnerHTML={{ __html: parsedHtmlBody }} />
        </div>
    );
};

export default PostBody;
