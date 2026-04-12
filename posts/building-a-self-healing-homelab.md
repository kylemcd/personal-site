---
share: "true"
ps-path: building-a-self-healing-homelab
title: Building a self healing homelab
date: 2026-04-12
substack-link: https://kpmsh.substack.com/p/building-a-self-healing-homelab
---
I got tired of finding out my homelab was broken only when I tried to use it.

I’d sit down to watch something on [Jellyfin](https://jellyfin.org/), hit play, nothing happened, and end up opening my laptop instead. Playback would fail, an import would stall, or two services would disagree about the same files in some annoying way. Sometimes Jellyfin could see the media, but ffmpeg would immediately choke when it actually tried to use it. Other times a media import would just sit there half-finished until I went digging. After enough nights like that, I stopped thinking of it as a bunch of small bugs and started thinking of it as a design problem.

## This was never really an uptime problem

For a long time, the homelab was good enough to be useful and bad enough to be annoying.

That is a rough place for a system to live. If everything is down, at least the problem is obvious. My problem was the opposite. Most of the stack usually looked fine. Then I would try to do something normal and find out one part in the middle had gone weird. A service could see files but not use them. An import pipeline would stall for no obvious reason. Permissions between services would drift just enough to break something. A mount would exist, but not in the way the app expected.

None of this was dramatic. That was the issue.

The failures were small, partial, and perfectly timed to waste my evening. They showed up when I wanted to use the homelab, not when I was already in the mood to maintain it.

## Why this was fixable

A big reason I could solve this in a useful way is that the homelab is built in [Nix](https://nixos.org/). The machines, services, mounts, reverse proxy config, and deployment flow already live in a repo instead of in a pile of manual fixes and old terminal history.

Once the system exists as code, the fix stops being manual cleanup.

If the system mostly lived as live state spread across a few machines, the best I could do was get better at noticing problems and faster at responding to them. Once the system exists as code, there is somewhere real for a fix to go. If a service has the wrong user, a bad path, a mount issue, or the usual permissions mess between apps, the right answer is usually to fix the system definition so it stops happening.

Once everything lived in code, the better question was not how to notice issues faster. It was how to make them easier to fix.
## The thing I was missing

The next shift was realizing that better recovery was not just about wiring alerts into a dashboard. I needed something that could look at a problem, understand enough of the system to make a good guess about what was wrong, and then try to fix it without waiting for me to step in every time.

That’s the gap AI ended up filling.

I already had logs. I already had alerts. What I did not have was anything in the middle that could take an incident and do real work with it. The useful thing an AI system can do here is not “be smart” in the abstract, where it just explains the problem or guesses at it from a distance. It can take an incident, inspect the code that defines the homelab, narrow down what is most likely wrong, and make a concrete change in the repo. That is very different from just telling me there was an error.

This change meant that the system stopped being limited to reporting problems and started being able to handle some of them.
## Building the loop

I ended up building a control plane for the homelab. Really, it's just an app that sits between alerts and the repo.

For observability, I use [OpenObserve](https://openobserve.ai/). That gives me a single place for logs and alerts, and it sends those alerts into the control plane when something goes wrong. From there, the control plane parses the alert, groups repeats, creates an incident, and decides whether it looks like noise or something worth acting on.

If it looks worth acting on, that’s where the AI comes in.

The control plane opens an isolated worktree against the repo and starts an [OpenCode](https://opencode.ai/) run. The runtime prompt is built around the homelab incident, the service involved, the error details, the worktree path, and the PR body it is expected to fill out. It can pull in more context when needed, including checking logs or inspecting live state, but it is still working in a tight lane. The end goal is not to poke around forever. It is to get close enough to the root cause to make the right change in the code that defines the system. Without that constraint, it would turn into a mess fast.

Because the homelab already has a declared shape, the AI has something concrete to inspect and change. If the problem is a permissions mismatch, a bad mount, the wrong path, or some other config-level mistake, it can often make the right change where that change belongs anyway. The end result is not a mystery fix on a live box. It is a real change in the repo, with a branch, a PR, and enough context for me to review it later.

A lot of the time, that means the system gets from incident to a concrete proposed fix before I need to get involved. I still review and approve the PR, but I am reviewing a repair instead of doing the whole investigation myself.
## Where it got annoying

The simple version is alerts in, fixes out.

In practice, it was messier. Once you build a loop like this, the loop itself becomes another system you have to make reliable. It was not enough to get the happy path working. I had to deal with duplicate incidents, stuck runs, retries, follow-ups, merge state, and old worktrees piling up after the fact. The control plane ended up needing its own cleanup and maintenance logic so it did not slowly turn into a second source of mess.

That took longer than I expected, but it is also the reason I trust it now. A self-healing system is only useful if it does not create a fresh problem every time it tries to solve one.
## What changed for me

Things still break. The difference is that I am usually reviewing the fix, not discovering the problem for the first time.

Before, a small issue could take over the whole evening because there was nothing between “something is off” and “I need to debug this right now.” Now there is a much better chance that the problem has already been surfaced, grouped with related noise, and pushed into a repair flow before I even think about opening my laptop.

That’s what made it feel more stable. It is not perfect, and it definitely is not simpler. It just interrupts me less. Which was the actual goal from the start, even if I did not phrase it that clearly at the time. I did not want to become a better on-call engineer for my own house. I wanted to use the homelab without thinking about maintenance most of the time. Dashboards and alerts could tell me something was wrong. They could not do anything about it.