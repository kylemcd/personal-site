import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { AlbumShelf } from "@/components/AlbumShelf";
import { Bookshelf } from "@/components/Bookshelf";
import { ErrorComponent } from "@/components/ErrorComponent";
import { Experience } from "@/components/Experience";
import { HomeHero } from "@/components/HomeHero";
import { HorizontalScrollContainer } from "@/components/HorizontalScrollContainer";
import { RacingStats } from "@/components/RacingStats";
import { Text } from "@/components/Text";
import { WritingList } from "@/components/WritingList";
import { books } from "@/lib/books";
import { iracing } from "@/lib/iracing";
import { markdown } from "@/lib/markdown";
import { spotify } from "@/lib/spotify";
import "@/styles/routes/home.css";

const getData = createServerFn({ method: "GET" }).handler(async () => {
	const result = await Effect.runPromise(
		Effect.all([
			iracing
				.summary()
				.pipe(Effect.catchAll(() => Effect.succeed({ races: [] }))),
			spotify.tracks().pipe(Effect.catchAll(() => Effect.succeed([]))),
			markdown.all().pipe(Effect.catchAll(() => Effect.succeed([]))),
			books
				.shelf()
				.pipe(
					Effect.catchAll(() =>
						Effect.succeed({ reading: [], finished: [], next: [] }),
					),
				),
		]),
	);

	return {
		iracing: result[0],
		spotify: result[1],
		writing: result[2],
		books: result[3],
	};
});

export const Route = createFileRoute("/")({
	component: Home,
	loader: () => getData(),
	errorComponent: ErrorComponent,
	head: () => ({
		meta: [
			{ title: "Kyle McDonald" },
			{ property: "og:title", content: "Kyle McDonald" },
			{
				property: "og:description",
				content:
					"Kyle McDonald's personal site where you can find his writings, projects, and other fun stuff.",
			},
			{ property: "og:url", content: "https://kylemcd.com" },
			{
				property: "og:image",
				content: "https://kylemcd.com/open-graph/home.png",
			},
			{ property: "og:image:type", content: "image/png" },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ property: "og:site_name", content: "Kyle McDonald" },
			{ property: "og:locale", content: "en-US" },
			{ property: "og:type", content: "website" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: "Kyle McDonald" },
			{
				name: "twitter:description",
				content:
					"Kyle McDonald's personal site where you can find his writings, projects, and other fun stuff.",
			},
			{
				name: "twitter:image",
				content: "https://kylemcd.com/open-graph/home.png",
			},
		],
	}),
});

function Home() {
	const { iracing, spotify, writing, books } = Route.useLoaderData();

	return (
		<>
			<HomeHero />
			<div className="section-container">
				<Text as="h2" size="2">
					Writing
				</Text>
				<WritingList writing={writing} />
			</div>
			<div className="section-container">
				<Text as="h2" size="2">
					Experience
				</Text>
				<Experience />
			</div>
			<div className="section-container section-container-flush-right">
				<Text as="h2" size="2">
					Listening
				</Text>
				<AlbumShelf albums={spotify} />
			</div>
			{(books?.reading || books?.finished) && (
				<div className="section-container section-container-flush-right">
					<HorizontalScrollContainer className="bookshelf-container">
						<div className="bookshelf-section">
							<Text as="h2" size="2">
								Reading
							</Text>
							<Bookshelf books={books.reading} />
						</div>
						<div className="bookshelf-section">
							<Text as="h2" size="2">
								Finished
							</Text>
							<Bookshelf books={books.finished} />
						</div>
					</HorizontalScrollContainer>
				</div>
			)}
			<div className="section-container">
				<Text as="h2" size="2" weight="500">
					Racing
				</Text>
				<RacingStats races={iracing.races} />
			</div>
		</>
	);
}

// import { createFileRoute } from '@tanstack/react-router'

// import {
//   Zap,
//   Server,
//   Route as RouteIcon,
//   Shield,
//   Waves,
//   Sparkles,
// } from 'lucide-react'

// export const Route = createFileRoute('/')({
//   component: App,
// })

// function App() {
//   const features = [
//     {
//       icon: <Zap className="w-12 h-12 text-cyan-400" />,
//       title: 'Powerful Server Functions',
//       description:
//         'Write server-side code that seamlessly integrates with your client components. Type-safe, secure, and simple.',
//     },
//     {
//       icon: <Server className="w-12 h-12 text-cyan-400" />,
//       title: 'Flexible Server Side Rendering',
//       description:
//         'Full-document SSR, streaming, and progressive enhancement out of the box. Control exactly what renders where.',
//     },
//     {
//       icon: <RouteIcon className="w-12 h-12 text-cyan-400" />,
//       title: 'API Routes',
//       description:
//         'Build type-safe API endpoints alongside your application. No separate backend needed.',
//     },
//     {
//       icon: <Shield className="w-12 h-12 text-cyan-400" />,
//       title: 'Strongly Typed Everything',
//       description:
//         'End-to-end type safety from server to client. Catch errors before they reach production.',
//     },
//     {
//       icon: <Waves className="w-12 h-12 text-cyan-400" />,
//       title: 'Full Streaming Support',
//       description:
//         'Stream data from server to client progressively. Perfect for AI applications and real-time updates.',
//     },
//     {
//       icon: <Sparkles className="w-12 h-12 text-cyan-400" />,
//       title: 'Next Generation Ready',
//       description:
//         'Built from the ground up for modern web applications. Deploy anywhere JavaScript runs.',
//     },
//   ]

//   return (
//     <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
//       <section className="relative py-20 px-6 text-center overflow-hidden">
//         <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>
//         <div className="relative max-w-5xl mx-auto">
//           <div className="flex items-center justify-center gap-6 mb-6">
//             <img
//               src="/tanstack-circle-logo.png"
//               alt="TanStack Logo"
//               className="w-24 h-24 md:w-32 md:h-32"
//             />
//             <h1 className="text-6xl md:text-7xl font-bold text-white">
//               <span className="text-gray-300">TANSTACK</span>{' '}
//               <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
//                 START
//               </span>
//             </h1>
//           </div>
//           <p className="text-2xl md:text-3xl text-gray-300 mb-4 font-light">
//             The framework for next generation AI applications
//           </p>
//           <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-8">
//             Full-stack framework powered by TanStack Router for React and Solid.
//             Build modern applications with server functions, streaming, and type
//             safety.
//           </p>
//           <div className="flex flex-col items-center gap-4">
//             <a
//               href="https://tanstack.com/start"
//               target="_blank"
//               rel="noopener noreferrer"
//               className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/50"
//             >
//               Documentation
//             </a>
//             <p className="text-gray-400 text-sm mt-2">
//               Begin your TanStack Start journey by editing{' '}
//               <code className="px-2 py-1 bg-slate-700 rounded text-cyan-400">
//                 /src/routes/index.tsx
//               </code>
//             </p>
//           </div>
//         </div>
//       </section>

//       <section className="py-16 px-6 max-w-7xl mx-auto">
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {features.map((feature, index) => (
//             <div
//               key={index}
//               className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
//             >
//               <div className="mb-4">{feature.icon}</div>
//               <h3 className="text-xl font-semibold text-white mb-3">
//                 {feature.title}
//               </h3>
//               <p className="text-gray-400 leading-relaxed">
//                 {feature.description}
//               </p>
//             </div>
//           ))}
//         </div>
//       </section>
//     </div>
//   )
// }
