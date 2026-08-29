import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const bucketName = "kpm-racing-media";
const objectPrefix = "tracks/iracing";
const cacheControl = "public, max-age=0, must-revalidate";
const concurrency = 6;
const maxUploadAttempts = 8;
const wranglerBinary = path.resolve("node_modules/.bin/wrangler");
const trackMapFilePattern =
	/^\d+\/(active|background|inactive|pitroad|start-finish|turns)\.svg$/;

async function collectFiles(directory, prefix = "") {
	const entries = await readdir(path.join(directory, prefix), {
		withFileTypes: true,
	});
	const files = [];

	for (const entry of entries) {
		const relativePath = path.posix.join(prefix, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await collectFiles(directory, relativePath)));
		} else if (entry.isFile()) {
			files.push(relativePath);
		}
	}

	return files;
}

async function uploadFile({ directory, relativePath }) {
	const isCatalog = relativePath === "catalog.json";
	const contentType = isCatalog
		? "application/json; charset=utf-8"
		: "image/svg+xml; charset=utf-8";

	for (let attempt = 1; attempt <= maxUploadAttempts; attempt += 1) {
		try {
			await execFileAsync(
				wranglerBinary,
				[
					"r2",
					"object",
					"put",
					`${bucketName}/${objectPrefix}/${relativePath}`,
					"--file",
					path.join(directory, relativePath),
					"--content-type",
					contentType,
					"--cache-control",
					cacheControl,
					"--remote",
					"--force",
				],
				{ cwd: process.cwd(), maxBuffer: 1024 * 1024 },
			);
			return;
		} catch (error) {
			if (attempt === maxUploadAttempts) throw error;
			const delayMs = Math.min(8000, 500 * 2 ** (attempt - 1));
			process.stdout.write(
				`Retrying ${relativePath} after failed upload (${attempt}/${maxUploadAttempts}).\n`,
			);
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}
}

export async function uploadRacingTrackMapDirectory({ directory }) {
	const discoveredFiles = await collectFiles(directory);
	const files = discoveredFiles
		.filter(
			(relativePath) =>
				relativePath === "catalog.json" ||
				trackMapFilePattern.test(relativePath),
		)
		.sort();
	const ignoredFiles = discoveredFiles.length - files.length;
	if (ignoredFiles > 0) {
		process.stdout.write(`Ignored ${ignoredFiles} unrelated files.\n`);
	}
	if (files.length === 0) {
		throw new Error(`No track-map assets found in ${directory}.`);
	}

	let nextIndex = 0;
	let uploaded = 0;
	await Promise.all(
		Array.from({ length: Math.min(concurrency, files.length) }, async () => {
			while (nextIndex < files.length) {
				const relativePath = files[nextIndex++];
				await uploadFile({ directory, relativePath });
				uploaded += 1;
				if (uploaded % 100 === 0 || uploaded === files.length) {
					process.stdout.write(
						`Uploaded ${uploaded}/${files.length} track assets.\n`,
					);
				}
			}
		}),
	);

	return {
		uploaded,
		svgCount: files.filter((file) => file.endsWith(".svg")).length,
	};
}
