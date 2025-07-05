type ErrorComponentProps = {
    error: unknown;
};

function ErrorComponent({ error }: ErrorComponentProps) {
    const e = error as Error & { cause?: unknown };

    return (
        <div style={{ color: 'red' }}>
            <h1>{e.message}</h1>
            {e.cause ? <pre>{JSON.stringify(e.cause, null, 2)}</pre> : null}
        </div>
    );
}

export { ErrorComponent };
