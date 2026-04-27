---
share: "true"
ps-path: navigation-without-thinking
title: Navigation without thinking
date: 2026-04-29
---
For a long time my window management strategy was just tolerating `cmd+tab`. With a few apps open it works fine, but once you have a dozen things running you are cycling through a strip of icons, overshooting, going back, trying to remember which space you left something on. The worst part is that it degrades exactly when you need it most, deep in something with a lot of things open.

It started the same way everything does, so I [made it my own](https://kylemcd.com/posts/making-things-your-own).

## Why any of this matters

The brain has a limited daily budget for decision-making and every choice draws from it, including the trivial ones. Researchers call it decision fatigue. It is widely cited that the average adult makes around 35,000 decisions a day. The number is hard to verify but easy to believe once you start paying attention. A [well-known study](https://www.pnas.org/doi/10.1073/pnas.1018033108) put it more concretely: judges granted parole about 65% of the time at the start of the day and less than 10% by the end. Same judges, same kind of cases, just later in the day after more decisions had piled up. The effect shows up in high-stakes decisions, but the same budget is getting spent on small ones too.

All of it chips away at that budget in a way that is easy to miss. Every `cmd+tab` overshoot, every moment you pause to remember which space something ended up on, every time you reach for the mouse because the keyboard path isn't obvious. None of it feels like much, but it is happening constantly. It is not exhausting. It is just a low-grade tax on your attention that runs all day.

The surprising thing is that shortcuts alone do not fix this. A shortcut still requires a decision: which one, in what context, am I even thinking about the right app. What actually helps is when the shortcuts stop requiring conscious thought. You want the browser and your hand is already going for `option+b` before you finish the thought. Getting there takes a few weeks of use, but once the muscle memory is formed the overhead genuinely disappears.

## Raycast

[Raycast](https://raycast.com) replaced spotlight for me. `cmd+space` still opens it so there was nothing to unlearn, and launching apps works the same way: type a couple of letters and you are there. Where it gets more interesting is everything else it can do. Honestly I am probably only using a small fraction of it, but even a couple of things have made a real difference.

Quick links are the main one. I have them set up for the places I go constantly: the Linear board for whatever I am working on, specific Notion pages, GitHub repos, internal dashboards at work. What used to be opening a browser, clicking through a bookmark, and navigating to the right page is now `cmd+space` and two letters. Small per use, but it adds up.

Clipboard history, unit conversions, quick calculations: anything that does not live in its own app lives in Raycast. Once you are used to staying in the keyboard, going back to the mouse for this stuff feels slow.

## Aerospace

[Aerospace](https://github.com/nikitabobko/AeroSpace) is a tiling window manager for macOS. The part I actually care about is workspaces: the ability to assign every app a dedicated slot and jump to it with a single shortcut, so no app ever needs to be hunted for.

Every app gets its own named workspace tied to a letter that matches what it is. Browser is `option+b`. Terminal is `option+t`. Slack is `option+s`. Cursor is `option+c`. There is nothing to memorize. B is browser, t is terminal. When a new window opens Aerospace moves it to the right workspace automatically, so I never think about where anything is.

After a couple of weeks the shortcuts stop being something you think about. You want the browser, your hand goes to `option+b`. No scanning, no cycling, no overshooting. The annoying thing about `cmd+tab` is that it gets slower and less predictable the more you have open, because you are always picking from a changing list. Aerospace is the same speed whether you have three apps running or twelve, because the destination never changes.

Part of why switching feels instant is that Aerospace does not use macOS Spaces at all. Native spaces have an animation baked in that you cannot fully remove. Reduce motion makes it slightly faster but the slide is always there. Aerospace sidesteps this by running its own workspace system, moving inactive windows off-screen rather than using spaces. The switch has no animation to wait for.

The physical side matters more than I expected. I wrote about my [split keyboard](https://kylemcd.com/posts/split-keyboard) separately, but the relevant part is home row mods: option sits under my fingers on the home row instead of in the bottom left corner. That makes `option+b` a comfortable hold-and-tap rather than a reach. On a standard keyboard that corner reach would have made the shortcuts annoying enough to undermine the whole thing. I know because I tried it that way first.

The full workspace list:

| Shortcut | Workspace |
|----------|-----------|
| `option+t` | Terminal |
| `option+b` | Browser |
| `option+c` | Cursor |
| `option+s` | Slack |
| `option+o` | Obsidian |
| `option+g` | GitHub Desktop |
| `option+l` | Linear |
| `option+n` | Notion |
| `option+e` | Mail |
| `option+w` | Calendar |
| `option+r` | Reminders |
| `option+a` | ChatGPT |
| `option+m` | Messages |
| `option+f` | Finder |
| `option+p` | 1Password |
| `option+z` | Zoom |

`option+shift+letter` moves the active window to a workspace rather than switching to it. If I am in the browser and want the terminal alongside it, `option+shift+t` sends it there. Same letter, same destination, just moving a window rather than going to one.

Putting things side by side comes up less than I expected. When switching is this fast, bouncing between the browser and the terminal does not really register as a context shift. It starts to feel more like glancing than switching.

## Inside the terminal

[Ghostty](https://ghostty.org) and [tmux](https://github.com/tmux/tmux) use the same shortcut logic inside the terminal: one modifier, one destination.

tmux windows work like browser tabs. `ctrl+t` opens a new window, `ctrl+w` closes a pane, and `ctrl+1` through `ctrl+9` jump to a window by number. I keep one window for whatever I am working on, one for running tests, one for logs. Getting between them is the same motion as switching tabs in a browser, which is why it felt familiar almost immediately.

Getting `ctrl+number` to work took some setup. Ghostty does not know about tmux natively, so the keybindings send escape sequences that tmux picks up. `ctrl+1` in Ghostty sends a byte sequence that tmux reads as "switch to window 1." Once it is configured you never think about it again. It just works like number switching.

For panes, `ctrl+shift+2` splits off a pane that takes up half the window, and `ctrl+shift+3` splits off one that takes up a third. Each shortcut adds one pane at that size, so you can build up the layout you want without thinking about split directions.

## Why this holds together

Raycast, Aerospace, tmux. None of them is doing anything complicated on its own. What makes them feel like one thing is that the shortcut logic is the same everywhere: one modifier, one destination. There is no point where you cross into a different tool and have to remember a different set of rules.

The first week you are still thinking about the shortcuts. After that your hands just know them, and navigating the computer stops drawing from the same budget you are trying to spend on real work. The judges in that study were not making worse decisions because the cases got harder. They were just depleted by the ones that came before. Every time you hunt for a window or reach for the mouse out of habit, that is the same thing at a smaller scale. Getting navigation out of your head and into your hands is how you stop paying that tax.
