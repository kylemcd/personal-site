import { Dithering } from "@paper-design/shaders-react";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import "./Wordmark.styles.css";

type WordmarkProps = {
	variant?: "hero" | "compact";
};

type Appearance = "light" | "dark";

type BaseShaderLayer = "border" | "ink" | "side" | "underline";

type ShaderLayer = BaseShaderLayer | "disturbance";

type ShaderHost = HTMLElement & {
	paperShaderMount?: {
		setUniforms: (uniforms: Record<string, number>) => void;
	};
};

type Point = {
	x: number;
	y: number;
};

const DITHER_FOREGROUND: Record<BaseShaderLayer, Record<Appearance, string>> = {
	ink: {
		dark: "#181818",
		light: "#ffffff",
	},
	border: {
		dark: "#303030",
		light: "#e6e6e6",
	},
	side: {
		dark: "#101010",
		light: "#eeeeee",
	},
	underline: {
		dark: "#404040",
		light: "#c8c8c8",
	},
};

const FLAT_COLORS: Record<BaseShaderLayer, Record<Appearance, string>> = {
	ink: {
		dark: "#ffffff",
		light: "#000000",
	},
	border: {
		dark: "#ffffff",
		light: "#000000",
	},
	side: {
		dark: "#4d4d4d",
		light: "#b2b2b2",
	},
	underline: {
		dark: "#9f9f9f",
		light: "#606060",
	},
};

const SHADER_LAYER_COUNT = 5;

const DITHER_SPEEDS: Record<ShaderLayer, { idle: number; hover: number }> = {
	ink: { idle: 0.18, hover: 0.68 },
	border: { idle: 0.09, hover: 0.34 },
	side: { idle: -0.07, hover: -0.28 },
	underline: { idle: 0.06, hover: 0.24 },
	disturbance: { idle: 0.16, hover: 0.92 },
};

const DISTURBANCE_POINTER_SCALE: Point = { x: 0.5, y: 0.197 };

const SHADER_CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
	alpha: true,
	antialias: true,
	premultipliedAlpha: true,
};

function mixHexColors(from: string, to: string, progress: number): string {
	const fromValue = Number.parseInt(from.slice(1), 16);
	const toValue = Number.parseInt(to.slice(1), 16);
	const amount = Math.min(Math.max(progress, 0), 1);
	const channels = [16, 8, 0].map((shift) => {
		const start = (fromValue >> shift) & 0xff;
		const end = (toValue >> shift) & 0xff;
		return Math.round(start + (end - start) * amount)
			.toString(16)
			.padStart(2, "0");
	});

	return `#${channels.join("")}`;
}

function useWordmarkShader(scrollLinked: boolean, allowShader: boolean) {
	const [state, setState] = useState<{
		appearance: Appearance;
		enabled: boolean;
		progress: number;
		resolved: boolean;
	}>({ appearance: "dark", enabled: false, progress: 1, resolved: false });

	useEffect(() => {
		const motionPreference = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		);
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("webgl2");
		const supportsShader = context !== null;
		context?.getExtension("WEBGL_lose_context")?.loseContext();

		let animationFrame = 0;

		const updateState = () => {
			animationFrame = 0;
			const appearance =
				document.documentElement.getAttribute("data-appearance") === "light"
					? "light"
					: "dark";
			const shaderEnabled =
				allowShader && supportsShader && !motionPreference.matches;
			const rootFontSize =
				Number.parseFloat(
					window.getComputedStyle(document.documentElement).fontSize,
				) || 16;
			const fadeDistance = Math.min(
				Math.max(window.innerHeight * 0.42, rootFontSize * 14),
				rootFontSize * 30,
			);
			const progress =
				shaderEnabled && scrollLinked
					? Math.min(Math.max(window.scrollY / fadeDistance, 0), 1)
					: 1;

			setState((current) =>
				current.appearance === appearance &&
				current.enabled === shaderEnabled &&
				current.progress === progress &&
				current.resolved
					? current
					: {
							appearance,
							enabled: shaderEnabled,
							progress,
							resolved: true,
						},
			);
		};
		const requestUpdate = () => {
			if (animationFrame === 0) {
				animationFrame = window.requestAnimationFrame(updateState);
			}
		};

		const appearanceObserver = new MutationObserver(requestUpdate);
		appearanceObserver.observe(document.documentElement, {
			attributeFilter: ["data-appearance"],
			attributes: true,
		});
		motionPreference.addEventListener("change", requestUpdate);
		window.addEventListener("scroll", requestUpdate, { passive: true });
		window.addEventListener("resize", requestUpdate);
		requestUpdate();

		return () => {
			appearanceObserver.disconnect();
			motionPreference.removeEventListener("change", requestUpdate);
			window.removeEventListener("scroll", requestUpdate);
			window.removeEventListener("resize", requestUpdate);
			window.cancelAnimationFrame(animationFrame);
		};
	}, [allowShader, scrollLinked]);

	return state;
}

function useHoverReveal(active: boolean, enabled: boolean) {
	const [amount, setAmount] = useState(0);
	const amountRef = useRef(0);

	useEffect(() => {
		if (!enabled) {
			amountRef.current = 0;
			setAmount(0);
			return;
		}

		const from = amountRef.current;
		const to = active ? 1 : 0;

		if (Math.abs(from - to) < 0.001) {
			amountRef.current = to;
			setAmount(to);
			return;
		}

		const duration = active ? 280 : 360;
		let animationFrame = 0;
		let startTime: number | undefined;

		const animate = (time: number) => {
			startTime ??= time;
			const progress = Math.min((time - startTime) / duration, 1);
			const easedProgress = progress * progress * (3 - 2 * progress);
			const nextAmount = from + (to - from) * easedProgress;

			amountRef.current = nextAmount;
			setAmount(nextAmount);

			if (progress < 1) {
				animationFrame = window.requestAnimationFrame(animate);
			}
		};

		animationFrame = window.requestAnimationFrame(animate);

		return () => window.cancelAnimationFrame(animationFrame);
	}, [active, enabled]);

	return amount;
}

function StaticWordmark() {
	return (
		<>
			<span className="wordmark-art-static wordmark-art-static-border" />
			<span className="wordmark-art-static wordmark-art-static-side" />
			<span className="wordmark-art-static-ink" />
			<span className="wordmark-art-static wordmark-art-static-underline" />
		</>
	);
}

function Wordmark({ variant = "hero" }: WordmarkProps) {
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	const [shaderReady, setShaderReady] = useState(false);
	const [shaderFailed, setShaderFailed] = useState(false);
	const [pointerDisturbance, setPointerDisturbance] = useState(0);
	const artRef = useRef<HTMLSpanElement>(null);
	const disturbanceShaderHost = useRef<ShaderHost | null>(null);
	const pointerTarget = useRef<Point>({ x: 0, y: 0 });
	const pointerCurrent = useRef<Point>({ x: 0, y: 0 });
	const pointerAnimation = useRef(0);
	const disturbanceDecay = useRef(0);
	const shader = useWordmarkShader(variant === "hero", true);
	const showStaticWordmark =
		variant === "compact" ||
		(shader.resolved && (!shader.enabled || shaderFailed));
	const hoverReveal = useHoverReveal(hovered || focused, shader.enabled);
	const displayProgress = Math.min(shader.progress, 1 - hoverReveal);
	const layerColor = (layer: BaseShaderLayer) => {
		const flat = FLAT_COLORS[layer][shader.appearance];
		return {
			back: flat,
			front: mixHexColors(
				DITHER_FOREGROUND[layer][shader.appearance],
				flat,
				displayProgress,
			),
		};
	};
	const layerSpeed = (layer: ShaderLayer) => {
		if (layer !== "disturbance" && displayProgress >= 1) return 0;

		const { idle, hover } = DITHER_SPEEDS[layer];
		return layer === "disturbance" ? idle + (hover - idle) * hoverReveal : idle;
	};
	const inkColor = layerColor("ink");
	const borderColor = layerColor("border");
	const sideColor = layerColor("side");
	const underlineColor = layerColor("underline");
	const disturbanceColor =
		shader.appearance === "dark"
			? { back: "#00000000", front: "#000000" }
			: { back: "#ffffff00", front: "#ffffff" };

	const setDisturbanceShaderHost = useCallback((node: HTMLElement | null) => {
		disturbanceShaderHost.current = node as ShaderHost | null;
	}, []);

	const applyPointerOffsets = useCallback((point: Point) => {
		artRef.current?.style.setProperty(
			"--wordmark-pointer-x",
			`${(point.x + 1) * 50}%`,
		);
		artRef.current?.style.setProperty(
			"--wordmark-pointer-y",
			`${(point.y + 1) * 50}%`,
		);

		disturbanceShaderHost.current?.paperShaderMount?.setUniforms({
			u_offsetX: point.x * DISTURBANCE_POINTER_SCALE.x,
			u_offsetY: point.y * DISTURBANCE_POINTER_SCALE.y,
		});
	}, []);

	const requestPointerAnimation = useCallback(() => {
		if (pointerAnimation.current !== 0) return;

		const animate = () => {
			const current = pointerCurrent.current;
			const target = pointerTarget.current;
			const next = {
				x: current.x + (target.x - current.x) * 0.14,
				y: current.y + (target.y - current.y) * 0.14,
			};
			const settled =
				Math.abs(target.x - next.x) < 0.001 &&
				Math.abs(target.y - next.y) < 0.001;

			pointerCurrent.current = settled ? target : next;
			applyPointerOffsets(pointerCurrent.current);

			if (settled) {
				pointerAnimation.current = 0;
				return;
			}

			pointerAnimation.current = window.requestAnimationFrame(animate);
		};

		pointerAnimation.current = window.requestAnimationFrame(animate);
	}, [applyPointerOffsets]);

	useEffect(() => {
		if (!shader.enabled || !artRef.current) {
			setShaderReady(false);
			setShaderFailed(false);
			return;
		}

		const art = artRef.current;
		const updateReadiness = () => {
			const canvases = art.querySelectorAll(".wordmark-art-shader canvas");
			const ready = canvases.length === SHADER_LAYER_COUNT;
			setShaderReady(ready);
			if (ready) setShaderFailed(false);
		};
		const observer = new MutationObserver(updateReadiness);
		const fallbackTimer = window.setTimeout(() => {
			const canvases = art.querySelectorAll(".wordmark-art-shader canvas");
			if (canvases.length !== SHADER_LAYER_COUNT) setShaderFailed(true);
		}, 1_500);

		observer.observe(art, { childList: true, subtree: true });
		updateReadiness();

		return () => {
			observer.disconnect();
			window.clearTimeout(fallbackTimer);
		};
	}, [shader.enabled]);

	useEffect(() => {
		if (shaderReady) applyPointerOffsets(pointerCurrent.current);
	}, [applyPointerOffsets, shaderReady]);

	useEffect(() => {
		return () => {
			window.cancelAnimationFrame(pointerAnimation.current);
			window.clearTimeout(disturbanceDecay.current);
		};
	}, []);

	const excitePointerDisturbance = () => {
		window.clearTimeout(disturbanceDecay.current);
		setPointerDisturbance(1);
		disturbanceDecay.current = window.setTimeout(
			() => setPointerDisturbance(0),
			240,
		);
	};

	const updatePointerTarget = (
		clientX: number,
		clientY: number,
		element: HTMLElement,
	) => {
		if (!shader.enabled) return;

		const bounds = element.getBoundingClientRect();
		pointerTarget.current = {
			x: Math.min(
				Math.max(((clientX - bounds.left) / bounds.width) * 2 - 1, -1),
				1,
			),
			y: Math.min(
				Math.max(((clientY - bounds.top) / bounds.height) * 2 - 1, -1),
				1,
			),
		};
		excitePointerDisturbance();
		requestPointerAnimation();
	};

	const resetPointerTarget = () => {
		window.clearTimeout(disturbanceDecay.current);
		setPointerDisturbance(0);
		pointerTarget.current = { x: 0, y: 0 };
		requestPointerAnimation();
	};

	return (
		<Link
			to="/"
			preload="intent"
			className="wordmark"
			data-variant={variant}
			data-shader={shader.enabled ? "active" : "inactive"}
			aria-label="Kyle McDonald — Home"
			onPointerEnter={(event) => {
				if (event.pointerType !== "touch") setHovered(true);
			}}
			onPointerMove={(event) =>
				updatePointerTarget(event.clientX, event.clientY, event.currentTarget)
			}
			onPointerLeave={() => {
				setHovered(false);
				resetPointerTarget();
			}}
			onFocus={() => setFocused(true)}
			onBlur={() => {
				setFocused(false);
				resetPointerTarget();
			}}
		>
			<span
				ref={artRef}
				className="wordmark-art"
				data-static-visible={showStaticWordmark ? "true" : "false"}
				data-shader-ready={shaderReady ? "true" : "false"}
				aria-hidden="true"
			>
				<StaticWordmark />
				{shader.enabled ? (
					<>
						<Dithering
							className="wordmark-art-shader wordmark-art-shader-border"
							width="100%"
							height="100%"
							colorBack={borderColor.back}
							colorFront={borderColor.front}
							shape="simplex"
							type="8x8"
							size={2.4}
							speed={layerSpeed("border")}
							frame={2_200}
							scale={0.82}
							minPixelRatio={1}
							maxPixelCount={1_100_000}
							webGlContextAttributes={SHADER_CONTEXT_ATTRIBUTES}
						/>
						<Dithering
							className="wordmark-art-shader wordmark-art-shader-side"
							width="100%"
							height="100%"
							colorBack={sideColor.back}
							colorFront={sideColor.front}
							shape="wave"
							type="8x8"
							size={2}
							speed={layerSpeed("side")}
							frame={4_800}
							scale={1.15}
							rotation={8}
							minPixelRatio={1}
							maxPixelCount={1_100_000}
							webGlContextAttributes={SHADER_CONTEXT_ATTRIBUTES}
						/>
						<Dithering
							className="wordmark-art-shader wordmark-art-shader-ink"
							width="100%"
							height="100%"
							colorBack={inkColor.back}
							colorFront={inkColor.front}
							shape="simplex"
							type="8x8"
							size={2}
							speed={layerSpeed("ink")}
							scale={0.6}
							minPixelRatio={1}
							maxPixelCount={1_100_000}
							webGlContextAttributes={SHADER_CONTEXT_ATTRIBUTES}
						/>
						<Dithering
							className="wordmark-art-shader wordmark-art-shader-underline"
							width="100%"
							height="100%"
							colorBack={underlineColor.back}
							colorFront={underlineColor.front}
							shape="simplex"
							type="8x8"
							size={2.2}
							speed={layerSpeed("underline")}
							frame={7_600}
							scale={0.28}
							rotation={90}
							minPixelRatio={1}
							maxPixelCount={1_100_000}
							webGlContextAttributes={SHADER_CONTEXT_ATTRIBUTES}
						/>
						<span
							className="wordmark-art-disturbance"
							style={{
								opacity: hoverReveal * (0.32 + pointerDisturbance * 0.56),
							}}
						>
							<Dithering
								ref={setDisturbanceShaderHost}
								className="wordmark-art-shader wordmark-art-shader-disturbance"
								width="100%"
								height="100%"
								colorBack={disturbanceColor.back}
								colorFront={disturbanceColor.front}
								shape="ripple"
								type="8x8"
								size={1.8}
								speed={layerSpeed("disturbance")}
								frame={3_400}
								fit="cover"
								scale={0.34}
								offsetX={pointerCurrent.current.x * DISTURBANCE_POINTER_SCALE.x}
								offsetY={pointerCurrent.current.y * DISTURBANCE_POINTER_SCALE.y}
								minPixelRatio={1}
								maxPixelCount={1_100_000}
								webGlContextAttributes={SHADER_CONTEXT_ATTRIBUTES}
							/>
						</span>
					</>
				) : null}
			</span>
		</Link>
	);
}

export { Wordmark };
