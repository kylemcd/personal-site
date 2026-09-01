import { Dithering } from "@paper-design/shaders-react";
import { Link } from "@tanstack/react-router";
import {
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import "./Wordmark.styles.css";

type WordmarkProps = {
	variant?: "hero" | "compact";
};

type ShaderRenderStatus = "idle" | "loading" | "ready" | "failed";

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

type MobileTouch = {
	intensity: number;
	moved: boolean;
	pointerId: number | null;
	point: Point;
	start: Point;
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

const mixHexColors = (from: string, to: string, progress: number): string => {
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
};

const clamp = (value: number, min: number, max: number): number => {
	return Math.min(Math.max(value, min), max);
};

const getPointerPoint = (
	clientX: number,
	clientY: number,
	element: HTMLElement,
): Point => {
	const bounds = element.getBoundingClientRect();

	return {
		x: clamp(((clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1),
		y: clamp(((clientY - bounds.top) / bounds.height) * 2 - 1, -1, 1),
	};
};

const useWordmarkShader = (scrollLinked: boolean) => {
	const [state, setState] = useState<{
		appearance: Appearance;
		ditherType: "4x4" | "8x8";
		enabled: boolean;
		mobileMotion: boolean;
		progress: number;
		resolved: boolean;
	}>({
		appearance: "dark",
		ditherType: "8x8",
		enabled: false,
		mobileMotion: false,
		progress: 1,
		resolved: false,
	});

	useEffect(() => {
		const motionPreference = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		);
		const mobileDither = window.matchMedia("(max-width: 47.9375rem)");
		const mobileMotion = window.matchMedia(
			"(hover: none) and (pointer: coarse)",
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
			const shaderEnabled = supportsShader && !motionPreference.matches;
			const ditherType = mobileDither.matches ? "4x4" : "8x8";
			const mobileMotionEnabled = shaderEnabled && mobileMotion.matches;
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
				current.ditherType === ditherType &&
				current.enabled === shaderEnabled &&
				current.mobileMotion === mobileMotionEnabled &&
				current.progress === progress &&
				current.resolved
					? current
					: {
							appearance,
							ditherType,
							enabled: shaderEnabled,
							mobileMotion: mobileMotionEnabled,
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
		mobileDither.addEventListener("change", requestUpdate);
		mobileMotion.addEventListener("change", requestUpdate);
		window.addEventListener("scroll", requestUpdate, { passive: true });
		window.addEventListener("resize", requestUpdate);
		requestUpdate();

		return () => {
			appearanceObserver.disconnect();
			motionPreference.removeEventListener("change", requestUpdate);
			mobileDither.removeEventListener("change", requestUpdate);
			mobileMotion.removeEventListener("change", requestUpdate);
			window.removeEventListener("scroll", requestUpdate);
			window.removeEventListener("resize", requestUpdate);
			window.cancelAnimationFrame(animationFrame);
		};
	}, [scrollLinked]);

	return state;
};

const useHoverReveal = (active: boolean, enabled: boolean) => {
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
};

const StaticWordmark = () => {
	return (
		<>
			<span className="wordmark-art-static wordmark-art-static-border" />
			<span className="wordmark-art-static wordmark-art-static-side" />
			<span className="wordmark-art-static-ink" />
			<span className="wordmark-art-static wordmark-art-static-underline" />
		</>
	);
};

const Wordmark = ({ variant = "hero" }: WordmarkProps) => {
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	const [touching, setTouching] = useState(false);
	const [shaderStatus, setShaderStatus] = useState<ShaderRenderStatus>("idle");
	const [pointerDisturbance, setPointerDisturbance] = useState(0);
	const artRef = useRef<HTMLSpanElement>(null);
	const disturbanceRef = useRef<HTMLSpanElement>(null);
	const disturbanceShaderHost = useRef<ShaderHost | null>(null);
	const pointerTarget = useRef<Point>({ x: 0, y: 0 });
	const pointerCurrent = useRef<Point>({ x: 0, y: 0 });
	const pointerAnimation = useRef(0);
	const mobileAnimation = useRef(0);
	const requestMobileAnimation = useRef<() => void>(() => undefined);
	const mobileTouch = useRef<MobileTouch>({
		intensity: 0,
		moved: false,
		pointerId: null,
		point: { x: 0, y: 0 },
		start: { x: 0, y: 0 },
	});
	const suppressNextClick = useRef(false);
	const disturbanceDecay = useRef(0);
	const shader = useWordmarkShader(variant === "hero");
	const shaderProgress = useRef(shader.progress);
	shaderProgress.current = shader.progress;
	const shaderReady = shaderStatus === "ready";
	const showStaticWordmark =
		variant === "compact" ||
		(shader.resolved && (!shader.enabled || shaderStatus === "failed"));
	const hoverReveal = useHoverReveal(
		hovered || focused || touching,
		shader.enabled,
	);
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
		disturbanceShaderHost.current = node;
	}, []);

	const applyPointerOffsets = useCallback((point: Point) => {
		disturbanceRef.current?.style.setProperty(
			"--wordmark-pointer-x",
			`${(point.x + 1) * 50}%`,
		);
		disturbanceRef.current?.style.setProperty(
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
		if (!shader.enabled || !shader.mobileMotion || variant !== "hero") return;

		const disturbance = disturbanceRef.current;
		if (!disturbance) return;

		window.cancelAnimationFrame(pointerAnimation.current);
		pointerAnimation.current = 0;

		let lastFrameTime = 0;
		let lastScrollTime = performance.now();
		let lastScrollY = window.scrollY;
		let scrollEnergy = 0;
		let scrollOffset = 0;

		const animate = (time: number) => {
			mobileAnimation.current = 0;
			const deltaTime = lastFrameTime
				? Math.min(time - lastFrameTime, 50)
				: 1000 / 60;
			const frameScale = deltaTime / (1000 / 60);
			const progress = shaderProgress.current;
			const heroAmount = 1 - clamp((progress - 0.62) / 0.36, 0, 1);
			const touch = mobileTouch.current;
			const touchTarget = touch.pointerId === null ? 0 : 1;
			const touchResponse = 1 - 0.8 ** frameScale;

			lastFrameTime = time;
			scrollOffset *= 0.88 ** frameScale;
			scrollEnergy *= 0.86 ** frameScale;
			touch.intensity += (touchTarget - touch.intensity) * touchResponse;

			const ambientTarget: Point = {
				x: Math.sin(time * 0.00028) * 0.24,
				y: Math.cos(time * 0.00022) * 0.14 + scrollOffset,
			};
			const target =
				touch.pointerId === null
					? heroAmount > 0
						? ambientTarget
						: { x: 0, y: 0 }
					: touch.point;
			const current = pointerCurrent.current;
			const pointerResponse = 1 - 0.84 ** frameScale;

			pointerTarget.current = target;
			pointerCurrent.current = {
				x: current.x + (target.x - current.x) * pointerResponse,
				y: current.y + (target.y - current.y) * pointerResponse,
			};
			applyPointerOffsets(pointerCurrent.current);

			const opacity =
				heroAmount *
				clamp(0.1 + scrollEnergy * 0.34 + touch.intensity * 0.58, 0, 0.88);
			disturbance.style.opacity = opacity.toFixed(3);

			const settlingAtRest =
				heroAmount === 0 &&
				touch.pointerId === null &&
				touch.intensity < 0.002 &&
				scrollEnergy < 0.002 &&
				Math.abs(pointerCurrent.current.x) < 0.002 &&
				Math.abs(pointerCurrent.current.y) < 0.002;

			if (!settlingAtRest) {
				mobileAnimation.current = window.requestAnimationFrame(animate);
			}
		};

		const startAnimation = () => {
			if (mobileAnimation.current !== 0) return;
			mobileAnimation.current = window.requestAnimationFrame(animate);
		};

		const handleScroll = () => {
			const now = performance.now();
			const nextScrollY = window.scrollY;
			const elapsed = Math.max(now - lastScrollTime, 16);
			const velocity = clamp((nextScrollY - lastScrollY) / elapsed, -2, 2);

			scrollOffset = clamp(scrollOffset + velocity * 0.16, -0.34, 0.34);
			scrollEnergy = Math.max(
				scrollEnergy,
				Math.min(Math.abs(velocity) * 0.7, 1),
			);
			lastScrollTime = now;
			lastScrollY = nextScrollY;
			startAnimation();
		};

		requestMobileAnimation.current = startAnimation;
		window.addEventListener("scroll", handleScroll, { passive: true });
		startAnimation();

		return () => {
			window.removeEventListener("scroll", handleScroll);
			window.cancelAnimationFrame(mobileAnimation.current);
			mobileAnimation.current = 0;
			requestMobileAnimation.current = () => undefined;
			disturbance.style.removeProperty("opacity");
			pointerTarget.current = { x: 0, y: 0 };
			pointerCurrent.current = { x: 0, y: 0 };
			applyPointerOffsets(pointerCurrent.current);
		};
	}, [applyPointerOffsets, shader.enabled, shader.mobileMotion, variant]);

	useEffect(() => {
		if (
			shader.enabled &&
			shader.mobileMotion &&
			variant === "hero" &&
			shader.progress < 0.98
		) {
			requestMobileAnimation.current();
		}
	}, [shader.enabled, shader.mobileMotion, shader.progress, variant]);

	useEffect(() => {
		if (!shader.enabled || !artRef.current) {
			setShaderStatus("idle");
			return;
		}

		const art = artRef.current;
		setShaderStatus("loading");
		const updateReadiness = () => {
			const canvases = art.querySelectorAll(".wordmark-art-shader canvas");
			const ready = canvases.length === SHADER_LAYER_COUNT;
			if (ready) setShaderStatus("ready");
		};
		const observer = new MutationObserver(updateReadiness);
		const fallbackTimer = window.setTimeout(() => {
			const canvases = art.querySelectorAll(".wordmark-art-shader canvas");
			if (canvases.length !== SHADER_LAYER_COUNT) setShaderStatus("failed");
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
			window.cancelAnimationFrame(mobileAnimation.current);
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

		pointerTarget.current = getPointerPoint(clientX, clientY, element);
		excitePointerDisturbance();
		requestPointerAnimation();
	};

	const beginMobileTouch = (event: ReactPointerEvent<HTMLAnchorElement>) => {
		if (
			event.pointerType !== "touch" ||
			!shader.enabled ||
			!shader.mobileMotion ||
			variant !== "hero" ||
			mobileTouch.current.pointerId !== null
		) {
			return;
		}

		const point = getPointerPoint(
			event.clientX,
			event.clientY,
			event.currentTarget,
		);
		mobileTouch.current = {
			...mobileTouch.current,
			moved: false,
			pointerId: event.pointerId,
			point,
			start: { x: event.clientX, y: event.clientY },
		};
		suppressNextClick.current = false;
		setTouching(true);
		event.currentTarget.setPointerCapture(event.pointerId);
		requestMobileAnimation.current();
	};

	const updateMobileTouch = (event: ReactPointerEvent<HTMLAnchorElement>) => {
		const touch = mobileTouch.current;
		if (event.pointerType !== "touch" || touch.pointerId !== event.pointerId) {
			return;
		}

		const distance = Math.hypot(
			event.clientX - touch.start.x,
			event.clientY - touch.start.y,
		);
		touch.moved ||= distance > 8;
		touch.point = getPointerPoint(
			event.clientX,
			event.clientY,
			event.currentTarget,
		);
		requestMobileAnimation.current();
	};

	const endMobileTouch = (
		event: ReactPointerEvent<HTMLAnchorElement>,
		cancelled = false,
	) => {
		const touch = mobileTouch.current;
		if (event.pointerType !== "touch" || touch.pointerId !== event.pointerId) {
			return;
		}

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		suppressNextClick.current = !cancelled && touch.moved;
		touch.pointerId = null;
		setTouching(false);
		requestMobileAnimation.current();
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
			data-mobile-motion={
				shader.mobileMotion && variant === "hero" ? "true" : "false"
			}
			aria-label="Kyle McDonald — Home"
			onPointerDown={beginMobileTouch}
			onPointerEnter={(event) => {
				if (event.pointerType !== "touch") setHovered(true);
			}}
			onPointerMove={(event) => {
				if (event.pointerType === "touch") {
					updateMobileTouch(event);
					return;
				}

				updatePointerTarget(event.clientX, event.clientY, event.currentTarget);
			}}
			onPointerUp={(event) => endMobileTouch(event)}
			onPointerCancel={(event) => endMobileTouch(event, true)}
			onPointerLeave={(event) => {
				if (event.pointerType === "touch") return;
				setHovered(false);
				resetPointerTarget();
			}}
			onClick={(event) => {
				if (!suppressNextClick.current) return;

				event.preventDefault();
				suppressNextClick.current = false;
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
							type={shader.ditherType}
							size={2.4}
							speed={layerSpeed("border")}
							frame={2_200}
							fit="contain"
							scale={0.82}
							worldWidth={1595}
							worldHeight={628}
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
							type={shader.ditherType}
							size={2}
							speed={layerSpeed("side")}
							frame={4_800}
							fit="contain"
							scale={1.15}
							rotation={8}
							worldWidth={1595}
							worldHeight={628}
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
							type={shader.ditherType}
							size={2}
							speed={layerSpeed("ink")}
							fit="contain"
							scale={0.6}
							worldWidth={1595}
							worldHeight={628}
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
							type={shader.ditherType}
							size={2.2}
							speed={layerSpeed("underline")}
							frame={7_600}
							fit="contain"
							scale={0.28}
							rotation={90}
							worldWidth={1595}
							worldHeight={628}
							minPixelRatio={1}
							maxPixelCount={1_100_000}
							webGlContextAttributes={SHADER_CONTEXT_ATTRIBUTES}
						/>
						<span
							ref={disturbanceRef}
							className="wordmark-art-disturbance"
							style={{
								opacity:
									shader.mobileMotion && variant === "hero"
										? undefined
										: hoverReveal * (0.32 + pointerDisturbance * 0.56),
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
								type={shader.ditherType}
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
};

export { Wordmark };
