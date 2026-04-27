---
share: "true"
ps-path: making-things-your-own
title: Making things your own
date: 2026-04-27
---

I keep accidentally writing about the same thing.

The topics look different at first. A split keyboard I have remapped so many times the layout barely resembles what it shipped with. A sim racing rig dialed in across hundreds of sessions until the hardware stopped getting in the way. A dotfiles repo that keeps my work and personal Mac feeling like the same machine.

Something off the shelf was close, but not quite right. It worked well enough that I could have left it alone. Then some small mismatch kept bothering me until I changed the thing to fit me better.

## Defaults are for getting started

Defaults are useful. They let you open a box, install an app, create an account, and get moving without making fifty decisions first. Most things would be miserable if they started by asking you to tailor the entire experience yourself.

But defaults are also compromises. They are built for a generalized version of the person doing the task. That version is a real concept, it is just not you. It does not have your desk, your hands, your house, your hobbies, your patience, your attention span, or your taste.

At first, the default is probably fine. Then you spend enough time with something and the weird little annoyances start to show. The shortcut requires an awkward reach. The chair is at the wrong height and the software files things somewhere that makes sense to nobody in particular. The workflow has a step in it you have been skipping for months. The thing is technically working, but using it always costs a little more effort than it should. Not enough to complain about, but enough to feel.

You get used to the mismatch, tell yourself that is just how the tool works, and build workarounds without noticing you are doing it. After enough time the workarounds become invisible and you forget the thing could have been different.

## A setup built around one person

My [`.computer`](https://github.com/kylemcd/.computer) repo started because I got tired of my work Mac and personal Mac feeling like different computers. Same person, same habits, same muscle memory, but one had the aliases, the shell setup, the editor config, and the other was always a little foreign. The repo fixed that. One place for everything, both machines pulling from it, both feeling like mine.

Looking through the history, no single change stands out. It is what they add up to. There is a commit early on that deleted the entire Nix and Home Manager setup: the flake, the Darwin config, the bootstrap script, nearly 800 lines, replaced with plain Homebrew and GNU Stow. Not because Nix was broken, but because I could not hold the whole thing in my head. A simpler setup I actually understand beats a theoretically correct one I am always fighting. The nvim config went through something similar around the same time: twenty-plus individual plugin files, each with its own configuration, collapsed into a single file with less to maintain and more room to actually change things.

Things get more granular from there. Three commits from a single afternoon where Ghostty, tmux, and the shell prompt are all getting their colors adjusted together, iterated until the whole environment looked like one place. Aliases accumulate because I kept typing the same sequences and eventually got annoyed enough to shorten them. Worktree helpers grow from a shell function into something more considered, then get revised as the way I actually work shifts. Even the `computer install` script grew its own conflict handling because the setup itself got complex enough to need it.

The pieces are technically separate but they do not behave that way. Ghostty passes keybindings through to tmux. tmux has bindings for switching windows and splitting panes that match how I actually move around. The colors land the same way across the terminal, the multiplexer, and the prompt. There is even a line in the tmux config specifically to allow escape sequences through for opencode. The kind of detail most people would never bother with, but I use it every day and noticed when it was missing.

When a setup gets this intentional it stops feeling like a collection of tools. The shortcuts reflect how you actually work, not how some default assumed you would. Nothing is in the wrong place because you moved everything that was.

## Software customization is getting easier

There is a version of this that used to be genuinely painful. Customizing an nvim config, for example, was a real commitment. You were learning Lua on the fly, working through plugin documentation that was often sparse or simply wrong, debugging changes that broke silently, and hoping someone on a forum had hit the exact same issue in the exact same version. A lot of people tried, got partway, and settled for something close enough.

AI agents have changed that pretty dramatically. The same kind of adjustment that used to take an afternoon now takes a few minutes. You describe what you want, get something that mostly works, and tweak from there. The feedback loop is short enough that fixing small things actually feels worth doing instead of something to defer forever.

Friction rarely announces itself as one big problem. It accumulates in the things that never quite worked the way you wanted, the config that always needed an extra step before you could actually get to the thing you were trying to do, the color theme that was close but never felt like it was actually yours. Individually each one is easy to wave off, but together they create this low-grade sense that you are working around the tool rather than with it. When fixing any of them takes five minutes, you actually fix them.

And it goes further than config files. If no existing tool does exactly what you want, building something that does is more accessible than it has ever been. A script that automates the specific workflow nobody else has, a small app that connects two things that never talked to each other, a local service built around exactly your data. These used to require dedicated engineering time or just accepting that the thing you wanted did not exist. More and more, they do not.

## Everything is a physical thing you live with

The tools and environments you spend real time in are not abstract. They have weight and position and texture, and whether they fit accumulates in ways that are hard to notice until you change something.

My sim racing rig is probably the clearest example I have of this. The adjustments look ridiculous from the outside: seat position, pedal angle, wheel settings, monitor distance, button box in exactly the right spot to reach without looking. None of those details are the hobby, but they determine how quickly the hardware disappears and the driving actually starts. A setup that almost fits keeps pulling your attention back to itself. One that fits just lets you drive.

A note system that only sort of matches how you think will always feel faintly annoying to use. A workflow where you have to consciously locate things every time will slowly cost you more than you notice. The friction is easy to write off and hard to stop paying.

The functional stuff is only part of it though. There is another layer that is easier to dismiss but just as real.

## How it looks is part of how it works

Aesthetics tend to get treated as the last thing, the part you get to once everything actually works. For tools you spend hours in every day that framing does not hold.

The three commits from a single afternoon getting Ghostty, tmux, and the shell prompt to match were not frivolous. Before they clicked, the terminal felt like a place I was visiting. After, it felt like mine. That sounds minor but it compounds in a real way. An environment that feels right is one you actually settle into, rather than spending the first ten minutes uneasy about something you can't name.

The quality of the work is not immune to the feeling of the space it happens in. This has always been true of physical spaces. People spend real money and effort on the desk, the chair, the light in the room. Digital environments get less obvious permission to matter in the same way, but they do. You are in them just as long.

Caring about how it looks is just caring about removing one more layer of friction between you and the work.

## The trap is endless tinkering

Making things your own can become a way to avoid doing the actual thing.

It is easy to spend an afternoon on the sim rig and call it racing, to redesign the note system and call it writing, to rebuild the homelab and call it productivity. The work of customizing something and the work of actually using it can blur together, especially when the customizing feels satisfying and the real thing is harder.

I have done this. The tell is usually that the tinkering stops being in service of anything specific. There is no problem to fix. You are just moving things around.

The question I try to ask is whether the change makes the real thing easier or more enjoyable to do. When I cannot answer that, I have probably already been tinkering too long.

## Off the shelf is fine, until it is not

Most things do not need this kind of attention. Plenty of defaults are genuinely good, and plenty of tools are not worth turning into a project. The instinct to customize everything is its own kind of problem.

But the things you spend real time with are different. The everyday tools and spaces that shape how you work, rest, and move through the day are worth getting right, not perfect, just shaped a little more like you and a little less like whoever the default was designed for.

When enough of it comes together, the setup, the feel, the way things fit, it stops being something you think about. The environment just disappears and you are doing the work.

That gap between how something works out of the box and how you would actually want it to work is always there. The rest just keeps bothering you.