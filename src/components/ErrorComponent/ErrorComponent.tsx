function ErrorComponent({ error }: { error: unknown }) {
	const message =
		error instanceof Error ? error.message : "An unexpected error occurred";
	const cause = error instanceof Error ? error.cause : undefined;

	return (
		<div role="alert" style={{ color: "red" }}>
			<h1>{message}</h1>
			{cause ? <pre>{JSON.stringify(cause, null, 2)}</pre> : null}
		</div>
	);
}

export { ErrorComponent };
