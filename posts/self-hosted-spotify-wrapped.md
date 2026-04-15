---
share: "true"
ps-path: self-hosted-spotify-wrapped
title: Rebuilding Spotify Wrapped for a self-hosted music setup
date: 2026-04-20
---
Before Spotify Wrapped was a thing, I used [Last.fm](http://last.fm/) to track my music.

I liked that it mostly stayed out of the way. It tracked what I played, and later I could go back and look at it. That was really all I needed. It felt more like a log than a product feature.

Last year I moved fully off streaming services and into hosting my own music. That has been great for all the obvious reasons. I like owning the library, I like supporting my favorite artists more directly, I like controlling the apps, and I like not renting access to music I care about. The one thing I knew I was going to miss was the recap. Not the giant branded slideshow version of it, just the simpler thing underneath. I still want to know what I played too much, what quietly took over a month of my life, and what I apparently got obsessed with without noticing.

Last.fm still has a good API and is still weirdly good at this exact job, so I started wondering if I could rebuild that part around the way I actually listen now.

The problem is that I do not really listen to music from one place anymore. At this point it is split across four different paths: my iPod, my phone, my laptop, and my record player. If I wanted my listening history to feel complete again, all four of those had to end up in Last.fm somehow.

## Phone and laptop

This part was easy because it already fit into the rest of what I use.

I already run Jellyfin for movies and TV, and Jellyfin can host music libraries too. I just needed a good way to actually listen on my devices, which is how I ended up finding [Manet](https://tilosoftware.io/manet/). Manet sits on top of Jellyfin, and there is already a [Last.fm plugin for Jellyfin](https://github.com/jesseward/jellyfin-plugin-lastfm), so once I installed that, my phone and laptop were handled.

That was nice mostly because I did not have to invent anything. Two of the four paths just dropped into place inside systems I was already using.

## iPod

The iPod was more annoying.

I assumed there had to be a solution already. Finding it was the hard part. Most of what I found was abandoned, ancient, or half-working. Eventually I ran into [Legacy Scrobbler](https://www.legacyscrobbler.software/), which was exactly the thing I needed.

It reads the listening history off the iPod when you sync it to your computer and sends that to Last.fm. I love software like this. It is tiny, specific, and clearly made by somebody who also had this exact problem. Once I found it, the iPod side was solved.

## Vinyl

The record player was the one I cared about most, so naturally it was also the annoying one.

Most of my listening at home happens there. If vinyl was missing, the whole setup would have felt fake. I could have tracked the iPod, phone, and laptop and technically called it done, but it would have left out the part I use the most.

Most of the vinyl scrobbling ideas I found were not very appealing. They usually came down to manually logging each record as you play it or faking the listen by silently playing the album somewhere else so Last.fm sees activity. Both technically work, but neither sounded like something I wanted to live with. Manual logging adds just enough friction that I know I would stop doing it, and the silent playback workaround felt insanely clunky.

What I wanted was something closer to song recognition. We already have things like Shazam and [ACR](https://www.acrcloud.com/) that can identify audio quickly and reliably. It did not seem that unreasonable that somebody would have built a version of that for this too.

I dug around for days before I finally found [Quanta](https://apps.apple.com/us/app/quanta-vinyl-companion/id1600262501).

The setup is pretty simple. I run the output from the DAC connected to my record player into an iOS device, Quanta listens to the signal, figures out the song, shows what is playing, and scrobbles it to Last.fm. It was exactly what I had been looking for.

What sold me on it was the [Discogs](https://www.discogs.com/) integration, since that is where I already track my vinyl collection. It can make better guesses based on albums I actually own instead of trying to identify from some nearly infinite library of songs. Small detail, but it makes a real difference.

One thing I did not expect is that the same iOS device can also send the record player output to AirPlay speakers. I ended up throwing it on an old iPad I had sitting around, and now that iPad mostly lives next to the turntable as a now-playing display and whole home audio hub. That turned out to be a great bonus.

## What I did with the data

Getting everything into one place was the original goal. Once that was working, I wanted somewhere better for it to end up.

I ended up aggregating everything into a [listening page on my personal site](https://kylemcd.com/listening). That is what made the whole thing feel finished. Last.fm is useful, but I did not want all of this to just sit there as raw scrobbles somewhere else.

Now all of it feeds a page on my site that shows top tracks, artists, albums, recent plays, and a month-by-month view of what I have been listening to. That is the part I missed more than I realized. Not the giant end-of-year presentation itself, just being able to look back and see the patterns. What kept showing up. What took over without me noticing. What I thought was just a short phase and apparently was not.

The music is self-hosted, the listening history is still there, and now the recap lives in a place I control too. That was really the whole point.

## This version makes more sense for me

Leaving streaming services comes with obvious tradeoffs, but this was the one thing I expected to miss and did not really have a replacement for in my head.

At this point, everything I actually listen through ends up in Last.fm. From there, it rolls into my own site in a way that feels more personal than the version I used to get from streaming apps. It is still the same basic idea in the end. It just fits the rest of the system better.