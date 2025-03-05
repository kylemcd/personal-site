---
title: Typescript moduleSuffixes with React Native
date: '2023-08-16T22:40:32.169Z'
---

For the longest time, there was no easy way for typescript to mirror the react-native compiler's pattern of prioritizing files based on extension (`.native`, `.web`). This meant that types in a component that needed to use that strategy were never 100% what the author wanted (or at least what I wanted). So now that this exists, let's go through an example to show: what I'm talking about and how powerful it can be!

## Identifying the problem

Let's first go through an example of the problem so that we can visualize what problem `moduleSuffixes` is solving.

First the file structure:

```typescript
Button
---index.ts
---index.native.ts
ButtonGroup
---index.ts
```

Inside of `ButtonGroup/index.ts` we'd want to import the Button so we could use it, like this:

```typescript
import { Button } from "./Button":
```

When following this pattern react-native will prioritize whichever file is most relevant to the user, so if you're importing from a react-native project, `Button/index.native.ts` would be the Button that displays. If you're on web and do the same import `Button/index.ts` would be the Button that displays.

Historically there was no good way of letting typescript know about this. So you'd have to define types that would be used across any platform that the component supports. If a type was only applicable to one platform you'd need runtime logic to handle notifying the engineer that this was the case. You would run into cases where a `Button` component that was built for cross platform usage would be able to be passed an `onPress` prop and an `onClick` prop without a type error, which means the engineer wouldn't get any feedback for if their prop was valid for the platform they were building for.

## Enter 2023

Now we have `modulesSuffixes`. Using this `tsconfig` option combined with some smart build output structuring lets typescript utilize the correct for the platform you're building for. Here's an example, again starting with file structure.

```typescript
react-native-project
---ButtonGroup.ts
---tsconfig.json

web-project
---ButtonGroup.ts
---tsconfig.json

shared-ui-library
---dist
------index.js
------index.d.ts
------index.native.js
------index.native.d.ts
---src
------index.ts
------index.native.ts
------Button
---------index.ts
---------Button.tsx
---------Button.native.tsx
---------Button.types.ts
---tsconfig.json
```

To summarize, we have a `react-native-project`, and a `web-project` that are utilizing a button from a `shared-ui-library` package.

### Setting up `tsconfig.json` files

Here are what the `tsconfig.json` files will look like across the 2 different projects that would be utilizing the shared `Button` component:

`react-native-project/tsconfig.json`
Notice that we tell typescript to prioritize file extensions containing `.native` as that is the first suffix in the array. The empty string (`""`) signifies no extension, so this will then look for any regular `.js/.ts/.d.ts` file.

```json
{
    "compilerOptions": {
        "moduleSuffixes": [".native", ""]
    }
}
```

`web-project/tsconfig.json`
Similar to the above, because this is a web project we don't care about suffixes (or we could and prioritize the `.web` extension). So for this example there is no suffix to prioritize.

```json
{
    "compilerOptions": {
        "moduleSuffixes": [""]
    }
}
```

`shared-ui-library/tsconfig.json`
This configuration is primarily to give the `tsc` build command some direction. You can definitely tailor this file differently to address your own needs.

```json
{
    "compilerOptions": {
        "outDir": "./dist",
        "module": "commonjs",
        "skipLibCheck": false,
        "noEmit": false
    }
}
```

### Setting up the shared Button component

To set up the Button to work with this configuration is pretty simple, but missing a step could mean this won't work, so make sure you follow every detail I'm about to explain.

First, here's a reminder of the file structure that we're working with for this section:

```typescript
shared-ui-library
---dist
------index.js
------index.d.ts
------index.native.js
------index.native.d.ts
---src
------index.ts
------index.native.ts
------Button
---------index.ts
---------Button.tsx
---------Button.native.tsx
---------Button.types.ts
---tsconfig.json
```

Inside of the `/src` directory it's important that we have two entry files, so that way out output of the build in the `/dist` directory contains files with and without the `.native` extension.

Here's the contents of each file (they're the same):

`src/index.ts`

```javascript
export { Button } from './Button';
```

`src/index.native.ts`

```javascript
export { Button } from './Button';
```

This tells the compiler to look into the Button folder for the Button component. Because the export is extension-less, it will prioritize the correct extension based on the platform.

Inside of the `/Button` directory you'll see a similar pattern:

`src/Button/index.ts`

```javascript
export { Button } from './Button';
```

Now here's where a bit of the magic happens so that you can have different types depending on the platform. We're going to create a typescript generic type that can infer the platform being passed in, then surface those types when utilizing the `Button` component. We'll use this type in both of the remaining `Button` files.

`src/Button/Button.types.ts`

```typescript
// Note: these types are simple for the example, you'd want to pull in correct types like HTMLButtonElement and Pressable props when doing this for real.
type NativeProps = {
    onPress: () => void;
};

type WebProps = {
    onClick: () => void;
};

export type ButtonProps<Platform> = Platform extends infer P
    ? P extends 'web'
        ? WebProps
        : P extends 'native'
        ? NativeProps
        : never
    : never;
```

Creating the `Button` components for each platform is pretty straightforward now that we have the `ButtonProps` type doing the heaving lifting.

`src/Button/Button.tsx`

```typescript
import { type ButtonProps } from './Button.types';

export function Button({ ...props }: ButtonProps<'web'>) {
    return <button {...props} />;
}
```

`src/Button/Button.native.tsx`

```typescript
import { type ButtonProps } from './Button.types';
import { Pressable } from 'react-native';

export function Button({ ...props }: ButtonProps<'native'>) {
    return <Pressable {...props} />;
}
```

### Setting up the build process

Now that we have all the pieces in place, it's time to build the button. Here's some helpful snippets from the `package.json` file in the `shared-ui-library`. The important pieces are that `main`, `types`, and `react-native` are pointing to the right places.

`shared-ui-library/package.json`

```json
{
    "name": "shared-ui-library",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "react-native": "src/index.native.ts",
    "scripts": {
        "build": "tsc"
    }
}
```

Your `/dist` folder should look roughly like this:

```typescript
dist
index.d.ts
index.js
index.native.d.ts
index.native.js
---Button
------Button.d.ts
------Button.jsx
------Button.native.d.ts
------Button.jsx
------Button.types.d.ts
------Button.types.js
------index.d.ts
------index.js
```

It's important that you have both extension-less and `.native` files in this folder so that typescript will be able to decipher which types belong to which platform.

### All done!

With this sort of setup you now have the ability to have mutually exclusive types for each platform and also the ability to share them as you please.

So now, when utilizing the `Button` component in the `web-project` and you pass it the `onPress` prop, a type error will throw since we defined in our `ButtonProps` type that `web` should be expecting `onClick`.

```typescript
import { Button } from 'shared-ui-library';
const ButtonGroup = () => {
    return (
        // Throws: Type "onPress" does not exist on type....
        <Button onPress={handleOnPress}>Click me</Button>
    );
};
```

## In conclusion

On the surface, this seems like such a trivial thing that should have been built into typescript awhile ago, but now that it's here (thanks [Adam Foxman](https://github.com/microsoft/TypeScript/pull/48189)), it's a huge unlock when it comes to type safety in cross platform applications in React and React Native. I will even be adapting this pattern to be used in the [cross platform library I'm working on](https://github.com/interunit/ui).
