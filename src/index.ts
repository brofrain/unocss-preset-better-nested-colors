import { kebabize, isObj, isStr } from './helpers'

import type { AttributifyOptions } from '@unocss/preset-attributify'
import type { RuleContext, DynamicShortcut, Preset } from 'unocss'

interface ThemeColors {
  [key: string]: string | ThemeColors
}

const THEME_COLORS_DEFAULT_KEY = 'DEFAULT'
const THEME_COLORS_VARIANT_KEY_PREFIX = ':'
const THEME_COLORS_PARENT_VALUE = '~'
const REG_COMMON_CLASS_CHARS = 'a-z 0-9 \\- \\_ \\, \\: \\[ \\] \\/ \\s'

const mergeKeys = (keyA: string, keyB: string) =>
  kebabize(
    `${keyA}-${keyB}`.replace(
      '-' + THEME_COLORS_VARIANT_KEY_PREFIX,
      THEME_COLORS_VARIANT_KEY_PREFIX,
    ),
  ).replace(/-$/, '')

const makeFlatColorsWithSuffix = (colors: ThemeColors) => {
  const flatColors: Record<string, string> = {}

  for (const [rawKey, value] of Object.entries(colors)) {
    const key = rawKey === THEME_COLORS_DEFAULT_KEY ? '' : rawKey

    if (isStr(value)) {
      flatColors[key] = value
    } else if (isObj(value)) {
      const flatValue = makeFlatColorsWithSuffix(value)

      for (const [subKey, subValue] of Object.entries(flatValue)) {
        if (
          key.startsWith(THEME_COLORS_VARIANT_KEY_PREFIX) &&
          !subKey.startsWith(THEME_COLORS_VARIANT_KEY_PREFIX)
        ) {
          flatColors[mergeKeys(subKey, key)] = subValue
        } else {
          flatColors[mergeKeys(key, subKey)] = subValue
        }
      }
    }
  }

  return flatColors
}

const inheritColorFromParent = (
  colorsWithPrefix: Record<string, string>,
  prefixedKeys: string[],
  key: string,
) => {
  const potentialParents = prefixedKeys.filter(
    (parentKey) =>
      parentKey in colorsWithPrefix &&
      key.length > parentKey.length &&
      key.includes(parentKey) &&
      !key.endsWith(parentKey), // ignore adjacent variants
  )

  if (!potentialParents.length) {
    delete colorsWithPrefix[key]
    return
  }

  const closestParent = potentialParents
    .slice(1)
    .reduce(
      (keyA, keyB) => (keyA.length > keyB.length ? keyA : keyB),
      potentialParents[0],
    )

  colorsWithPrefix[key] = colorsWithPrefix[closestParent]
}

const setColorByReference = (
  colorsWithPrefix: Record<string, string>,
  colorsWithSuffix: Record<string, string>,
  key: string,
) => {
  const referenceKey = colorsWithPrefix[key]

  if (
    colorsWithPrefix[referenceKey] in colorsWithSuffix &&
    referenceKey !== colorsWithPrefix[referenceKey]
  ) {
    setColorByReference(colorsWithPrefix, colorsWithSuffix, referenceKey)
  }

  colorsWithPrefix[key] = colorsWithSuffix[referenceKey]
}

const fillColorValues = (
  colorsWithPrefix: Record<string, string>,
  colorsWithSuffix: Record<string, string>,
) => {
  const prefixedKeys = Object.keys(colorsWithPrefix).sort(
    (keyA, keyB) => keyA.length - keyB.length,
  )

  for (const key of prefixedKeys) {
    if (colorsWithPrefix[key] === THEME_COLORS_PARENT_VALUE) {
      inheritColorFromParent(colorsWithPrefix, prefixedKeys, key)
    }
  }

  for (const key in colorsWithPrefix) {
    if (
      colorsWithPrefix[key] in colorsWithSuffix &&
      key !== colorsWithPrefix[key]
    ) {
      setColorByReference(colorsWithPrefix, colorsWithSuffix, key)
    }
  }
}

const makeFlatColorsWithPrefix = (colors: ThemeColors) => {
  const colorsWithSuffix = makeFlatColorsWithSuffix(colors)

  const colorsWithPrefix = Object.fromEntries(
    Object.entries(colorsWithSuffix).map(([key, value]) => {
      const keyArr = key.split(THEME_COLORS_VARIANT_KEY_PREFIX)

      let newKey = keyArr.shift() as string

      if (keyArr.length) {
        // has variants
        keyArr.reverse()
        newKey = `${keyArr.join(THEME_COLORS_VARIANT_KEY_PREFIX)}:${newKey}`
      }

      return [newKey, value]
    }),
  )

  fillColorValues(colorsWithPrefix, colorsWithSuffix)

  return colorsWithPrefix
}

const makeDynamicColors = (colors: ThemeColors) => {
  const flatColorsEntries = Object.entries(makeFlatColorsWithPrefix(colors))

  return flatColorsEntries
    .map(([key, value]) => {
      const keyArr: string[] = key.split(THEME_COLORS_VARIANT_KEY_PREFIX)

      const colorName = keyArr.pop() as string

      if (!keyArr.length) {
        return { colorName, variantGroups: { ['' as string]: value } }
      }

      keyArr.reverse()
      const modifiers = (keyArr.join(':') + ':').toLowerCase()

      return { colorName, variantGroups: { [modifiers]: value } }
    })
    .filter((item, i, arr) => {
      // merge variants of the same color name

      if (!i) {
        return true
      }

      const previousItemOfSameName = arr
        .slice(0, i)
        .find(({ colorName }) => colorName === item.colorName)

      if (!previousItemOfSameName) {
        return true
      }

      const [variantGroup, variantGroupValue] = Object.entries(
        item.variantGroups,
      )[0]

      previousItemOfSameName.variantGroups[variantGroup] = variantGroupValue

      return false
    })
}

const makeDynamicColorsShortcuts = (colors: ThemeColors) =>
  makeDynamicColors(colors).map(({ colorName, variantGroups }) => {
    const reg = new RegExp(
      [
        '^',
        `( [ ${REG_COMMON_CLASS_CHARS} \\( ]+ )`, // preceding characters and eventual opening bracket of a variant group
        '( [^  \\- \\s \\( ] [ \\- \\s \\( ] )', // dash OR opening bracket of a variant group OR space as a separator inside a variant group ONLY ONCE
        colorName,
        '( ( \\/ \\d+ ) )?', // optional opacity modifier
        `( ( [ ${REG_COMMON_CLASS_CHARS} ]+ ) \\) ) ?`, // if closing bracket of a variant group, then some following characters are allowed
        '$',
      ]
        .join('')
        .replaceAll(' ', ''),
    )

    const variantGroupsEntries = Object.entries(variantGroups).map(
      ([prefix, color]) => [
        prefix,
        color.replaceAll(' ', '_'), // handle whitespaces
      ],
    )

    let attributifyPrefix: string | null | undefined // `null` - no Attributify Mode OR prefix is disabled | `undefined` - not checked for the prefix yet
    const setAttributifyPrefix = ({ generator }: RuleContext) => {
      const attributifyConfig = generator.config.presets.find(
        ({ name }) => name === '@unocss/preset-attributify',
      )

      if (attributifyConfig) {
        const { prefix } = attributifyConfig.options as AttributifyOptions
        attributifyPrefix = prefix || null
      } else {
        attributifyPrefix = null
      }
    }

    return [
      reg,
      ({ input }: RegExpMatchArray, context: RuleContext) => {
        if (!input) {
          return ''
        }

        if (attributifyPrefix === undefined) {
          setAttributifyPrefix(context)
        }

        if (
          !input ||
          // don't generate redundant shortcuts for Attributify Mode
          (attributifyPrefix && input.startsWith(attributifyPrefix))
        ) {
          return ''
        }

        const startsVariantGroup = input[0] === '('

        const utilityClass = startsVariantGroup ? input.slice(1) : input

        return (
          (startsVariantGroup ? '(' : '') +
          variantGroupsEntries
            .map(
              ([prefix, color]) =>
                `${prefix}${utilityClass.replaceAll(colorName, `[${color}]`)}`,
            )
            .join(' ')
        )
      },
    ] as DynamicShortcut
  })

export interface PresetBetterNestedColorsOptions {
  colors: ThemeColors
}

const presetBetterNestedColors = ({
  colors,
}: PresetBetterNestedColorsOptions): Preset => ({
  name: 'unocss-better-nested-colors',
  shortcuts: makeDynamicColorsShortcuts(colors),
})

export { presetBetterNestedColors }
