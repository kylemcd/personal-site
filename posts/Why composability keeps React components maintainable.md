---
share: "true"
---
Over the years, I’ve built and rebuilt component libraries in different environments, mostly in startups where speed is a priority. The biggest lesson I’ve learned? **Composability is everything.**

It’s tempting to make a single component that tries to handle every possible variation—just add another prop, right? But that leads to bloated APIs, fragile logic, and an eventual mess of conditionals no one wants to touch. The better approach is to break things into smaller, reusable pieces that can be combined in flexible ways. If you need to tweak behavior, **drop down a level** instead of cramming in another prop.

This mindset shift—focusing on composability over configuration—has completely changed how I approach component libraries.

## Start with design tokens

Before thinking about components, I start with **design tokens**—colors, spacing, typography. Tokens are the foundation of every decision that follows.

A well-structured token system makes everything easier:

- **Consistent UI** – Spacing and color are always applied from a shared scale, not arbitrary pixel values.
- **Easy updates** – Need to adjust a spacing value across the app? Change the token once, and it updates everywhere.
- **Simpler theming** – Switching to dark mode or adjusting a brand color is a token-level change, not a rewrite of component styles.

Skipping tokens might feel faster early on, but you’ll end up with five different grays and random, inconsistent spacing values scattered throughout the codebase. Retrofitting a token system later is painful—it’s better to start with one from the beginning.

## Small primitives, big impact

With tokens in place, the next step is **primitives**—the low-level building blocks that every component builds upon.

These are things like:

- **`Box`** – A div with token-based props for padding, margin, and color.
- **`Stack`** – A simple way to space items vertically or horizontally.
- **`Text`** – A wrapper around typography styles.

These primitives do just enough to be useful but don’t introduce unnecessary complexity. Instead of writing raw CSS every time, you pass tokens via props (`margin="2"`, `color="blue-09"`), keeping everything predictable and scalable.

Without primitives, styling quickly becomes inconsistent. Every engineer reaches for different approaches—some use inline styles, some add utility classes, some write one-off CSS rules. A solid set of primitives removes that guesswork.

## Complex components should be built from small parts

Once the primitives are in place, more advanced components—`Modal`, `Combobox`, `Popover`—are just compositions of these smaller pieces.

Building UI this way has a few big advantages:

- **Token-aligned by default** – If a `Modal` uses a `Stack` inside, it automatically follows the same spacing system as the rest of the app.
- **No duplication** – Fix or improve a primitive, and every component using it gets the benefit.
- **Faster iteration** – New features come together quickly because the core building blocks already exist.

I’ve seen teams struggle when they treat every new feature as a **one-off component**, instead of thinking about how to assemble it from existing parts. Eventually, the design system starts duplicating itself in slightly different ways across components. Keeping things modular prevents that.

## Composability over configuration

One of the biggest shifts I’ve made is in how I structure even **individual** components. Take a button, for example.

The old way of thinking:

```
<Buttontext="Submit"icon={CheckIcon}variant="primary" />
```

Seems fine, right? Until someone asks for an icon on top of the text. Then another person wants different spacing for a specific case. Soon, you’re adding a dozen new props, and the API becomes bloated and hard to maintain.

A better approach:

```
<Button.Rootvariant="primary">
    <Button.Iconicon={CheckIcon} />
    <Button.Text>Submit</Button.Text>
</Button.Root>
```

Now, the structure is **composable** instead of overly configured.

- **Need a different layout?** Just reorder the pieces.
- **Want a special case?** Drop down to `Button.Root` instead of modifying the main `Button`.
- **Still want a simple API?** You can export a pre-composed `Button` that defaults to the common structure.

This pattern applies everywhere—forms, modals, dropdowns. Instead of a single component trying to do it all, **let developers compose what they need from smaller parts**.

## The do’s and don’ts of a good component library

### Do

✅ **Use tokens for everything** – Spacing, color, typography should always come from a shared system.

✅ **Build on primitives** – Keep low-level building blocks small, simple, and reusable.

✅ **Compose instead of over-configuring** – Break things into parts instead of stuffing more props into a single component.

✅ **Add features when they’re needed** – Build for actual product needs, not speculative edge cases.

### Don't

🚫 **Hardcode styles** – Inline styles or random hex codes lead to inconsistency.

🚫 **Skip accessibility** – If a primitive has an ARIA role or keyboard handling, use it.

🚫 **Over-engineer for hypotheticals** – Solve for what the product actually needs today.

🚫 **Ignore naming conventions** – A predictable API makes it easier to adopt and scale.

## Wrapping up

I’ve made every mistake on this list at some point—overstuffed props, bloated “mega components,” inconsistent styling. Every time, I’ve found my way back to the same core principles:

1. **Start with tokens** so the system stays consistent.
2. **Build primitives** that handle the basics like layout and spacing.
3. **Compose larger components** from those primitives instead of reinventing the wheel.
4. **Let developers drop down to smaller parts** instead of adding more configuration props.

This approach keeps the design system flexible, scalable, and easy to maintain—without falling into the trap of endless customization and rework.

If you’re building a component library, **prioritize composability** and make sure every piece can stand on its own. It’ll save you a ton of time (and headaches) in the long run.