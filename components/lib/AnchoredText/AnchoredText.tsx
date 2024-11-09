'use client'
import { Text, type TextProps } from '@/components/lib/Text'
import { Hash } from '@phosphor-icons/react'
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import Link from 'next/link';


type AnchoredTextProps<T extends React.ElementType> = TextProps<T>

const AnchoredText = <T extends React.ElementType>({ children, ...props }: AnchoredTextProps<T>) => {
    return (
        <Text className="anchored-text" {...props}>
            <span className="anchored-text-button-container">
                <Link
                    href={`#${props.id}`}
                    replace
                    className="anchored-text-button"
                    onClick={() => {
                        const url = window.location.href
                        const urlToCopy = url.split('#')[0] + `#${props.id}`
                        navigator.clipboard.writeText(urlToCopy)
                    }}
                >
                    <VisuallyHidden.Root>
                        Link to {props.children}
                    </VisuallyHidden.Root>
                    <Hash size={16} className="anchored-text-button-icon" />
                </Link>
            </span>
            {children}
        </Text>
    )
}

export { AnchoredText }