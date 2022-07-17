import { createGenerator, presetAttributify, presetWind } from 'unocss'

import type { UnoGenerator } from 'unocss'

import { presetBetterNestedColors } from '../src'

const CONFIG: Parameters<typeof presetBetterNestedColors>[0] = {
  colors: {
    primary: {
      DEFAULT: '#f5f5f5',
      ':dark': '#1a1a1a',
    },

    secondary: {
      DEFAULT: 'rgba(40, 40, 40, .8)',
      ':dark': 'rgba(250, 250, 250, .9)',

      interactive: {
        DEFAULT: '~',
        ':dark': '~',
        ':hover': 'accent',
      },
    },

    accent: {
      DEFAULT: '#42b883',
      contrast: '#fff',

      focus: {
        DEFAULT: '#33a06f',
        ':dark': '#42d392',
      },

      interactive: {
        DEFAULT: '~',
        ':hover': {
          DEFAULT: 'accent-focus',
          ':dark': 'accent-focus:dark',
        },

        contrast: {
          DEFAULT: 'accent-contrast',
          ':dark': '#333',
          ':disabled': {
            DEFAULT: '#f1f1f1',
            ':dark': '#888',
          },
        },
      },
    },
  },
}

export const uno: UnoGenerator = createGenerator({
  presets: [presetWind(), presetBetterNestedColors(CONFIG)],
})

export const unoAttributify: UnoGenerator = createGenerator({
  presets: [
    presetWind(),
    presetAttributify({ prefix: 'attributify:' }),
    presetBetterNestedColors(CONFIG),
  ],
})
