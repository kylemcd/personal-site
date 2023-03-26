import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
    static async getInitialProps(ctx) {
        const originalRenderPage = ctx.renderPage;

        // Run the React rendering logic synchronously
        ctx.renderPage = () =>
            originalRenderPage({
                // Useful for wrapping the whole react tree
                enhanceApp: (App) => App,
                // Useful for wrapping in a per-page basis
                enhanceComponent: (Component) => Component,
            });

        // Run the parent `getInitialProps`, it now includes the custom `renderPage`
        const initialProps = await Document.getInitialProps(ctx);

        const cookies = ctx.req.headers.cookie;
        if (cookies) {
            const unparsedHSL = cookies?.split('=')[1];
            initialProps.themeColor = unparsedHSL ? decodeURIComponent(unparsedHSL) : '';
        }

        return initialProps;
    }

    render() {
        const { themeColor } = this.props;
        const cssVariables = themeColor ? { '--primary-color': themeColor } : {};
        return (
            <Html style={cssVariables}>
                <Head />
                <body>
                    <Main />
                    <NextScript />
                </body>
            </Html>
        );
    }
}

export default MyDocument;
