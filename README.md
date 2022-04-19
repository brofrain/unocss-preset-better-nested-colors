# unocss-preset-better-nested-colors

> 🎭 Colors with pre-defined variants and more

The preset expands customization of theme colors by generating adequate dynamic shortcuts.\
This allows to pre-define both colors and their behavior in certain variations (e.g. `hover`, `focus`, `dark` ).\
The preset also introduces in-config color references and parent color value inheritance, to prevent unnecessary redundation.

_The project is currently more of an experiment with shotgun-style implementation - it still attempts to discover what it really wants to be._

## Installation

```bash
# pnpm
pnpm add -D unocss-preset-better-nested-colors

# yarn
yarn add -D unocss-preset-better-nested-colors

# npm
npm i --save-dev unocss-preset-better-nested-colors
```

## Example

```typescript
import { defineConfig, presetUno } from "unocss";
import presetBetterNestedColors from "unocss-preset-better-nested-colors";

export default defineConfig({
  presets: [presetUno(), presetBetterNestedColors()],

  theme: {
    colors: {
      primary: {
        DEFAULT: "#eee",
        ":dark": "#222",
      },

      secondary: {
        DEFAULT: "rgb(50,50,50)",
        ":dark": "rgb(250,250,250)",

        interactive: {
          DEFAULT: "~", // inheritance "rgb(50,50,50)"
          ":dark": "~", // inheritance "rgb(250,250,250)"
          ":hover": "accent", // reference to "accent" => "#f00"
        },
      },

      accent: {
        DEFAULT: "#f00",

        interactive: {
          DEFAULT: "~", // inheritance "#f00"
          ":hover": {
            DEFAULT: "#ff0",
            ":dark": "#f0f",
          },
          ":disabled": "secondary", // reference to "secondary" => "rgb(50,50,50)"
          ":disabled:dark": "secondary:dark", // reference to "secondary" with "dark" variant => "rgb(250,250,250)"
        },
      },

      red: {
        DEFAULT: "red-200", // reference to "red-200" => "#c00"
        100: "#b00",
        200: "#c00",
        300: "#d00",
        400: "#e00",
      },

      green: {
        DEFAULT: "#0c0",
        100: "#0b0",
        200: "~", // inheritance "#0c0"
        300: "#0d0",
        400: "#0e0",
      },
    },
  },
});
```

Example interactions with the above config:

```
bg-primary                 =>  bg-[#eee] dark:bg-[#222]
bg-secondary-interactive   =>  bg-[rgb(50,50,50)] dark:bg-[rgb(250,250,250)] hover:bg-[#f00]
bg-accent-interactive      =>  bg-[#f00] hover:bg-[#ff0] hover:dark:bg-[#f0f] disabled:bg-[rgb(50,50,50)] disabled:dark:bg-[rgb(250,250,250)]
bg-red                     =>  bg-[#c00]
bg-red-200                 =>  bg-[#c00]
bg-red-300                 =>  bg-[#d00]
bg-green                   =>  bg-[#0c0]
bg-green-200               =>  bg-[#0c0]
```

## License

MIT License

Copyright (c) 2022-PRESENT Kajetan Welc

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
