type DocumentProps = {
    children: React.ReactNode;
};

const Document = ({ children }: DocumentProps) => {
    return (
        <html lang="en">
            <head>
                <title>My App</title>
                <meta charSet="UTF-8" />
            </head>
            <body>
                <div id="root">{children}</div>
                {/* <script type="module" async src="/build-target.js"></script> */}
            </body>
        </html>
    );
};

export { Document };
