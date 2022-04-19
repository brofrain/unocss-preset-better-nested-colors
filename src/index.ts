import type {
  Preset,
  RuleContext,
  DynamicShortcut,
  UserShortcuts,
} from "unocss";
import type { AttributifyOptions } from "@unocss/preset-attributify";

import { kebabCase, isObj, isStr } from "./utils";

interface ThemeColors {
  [key: string]: string | ThemeColors;
}

interface UserTheme {
  colors?: ThemeColors;
  shortcuts?: UserShortcuts;
}

const THEME_COLORS_DEFAULT_KEY = "DEFAULT";
const THEME_COLORS_VARIANT_KEY_PREFIX = ":";
const THEME_COLORS_INHERIT_VALUE = "~";
const REG_COMMON_CLASS_CHARS = "a-z 0-9 \\- \\_ \\, \\: \\[ \\] \\/ \\s";

const mergeKeys = (keyA: string, keyB: string) =>
  kebabCase(`${keyA}-${keyB}`.replace("-:", ":")).replace(/-$/, "");

const makeFlatColorsWithSuffix = (colors: ThemeColors) => {
  const flatColors: Record<string, string> = {};

  for (const [rawKey, value] of Object.entries(colors)) {
    const key = rawKey === THEME_COLORS_DEFAULT_KEY ? "" : rawKey;

    if (isStr(value)) {
      flatColors[key] = value;
    } else if (isObj(value)) {
      const flatValue = makeFlatColorsWithSuffix(value);

      for (const [subKey, subValue] of Object.entries(flatValue)) {
        if (
          key.startsWith(THEME_COLORS_VARIANT_KEY_PREFIX) &&
          !subKey.startsWith(THEME_COLORS_VARIANT_KEY_PREFIX)
        ) {
          flatColors[mergeKeys(subKey, key)] = subValue;
        } else {
          flatColors[mergeKeys(key, subKey)] = subValue;
        }
      }
    }
  }

  return flatColors;
};

const inheritColorFromParent = (
  colorsWithPrefix: Record<string, string>,
  prefixedKeys: string[],
  key: string
) => {
  const potentialParents = prefixedKeys.filter(
    (parentKey) =>
      parentKey in colorsWithPrefix &&
      key.length > parentKey.length &&
      key.includes(parentKey) &&
      !key.endsWith(parentKey) // ignore adjacent variants
  );

  if (!potentialParents.length) {
    delete colorsWithPrefix[key];
    return;
  }

  const closestParent = potentialParents
    .slice(1)
    .reduce(
      (keyA, keyB) => (keyA.length > keyB.length ? keyA : keyB),
      potentialParents[0]
    );

  colorsWithPrefix[key] = colorsWithPrefix[closestParent];
};

const setColorByReference = (
  colorsWithPrefix: Record<string, string>,
  colorsWithSuffix: Record<string, string>,
  key: string
) => {
  const referenceKey = colorsWithPrefix[key];

  if (
    colorsWithPrefix[referenceKey] in colorsWithSuffix &&
    referenceKey !== colorsWithPrefix[referenceKey]
  ) {
    setColorByReference(colorsWithPrefix, colorsWithSuffix, referenceKey);
  }

  colorsWithPrefix[key] = colorsWithSuffix[referenceKey];
};

const fillColorValues = (
  colorsWithPrefix: Record<string, string>,
  colorsWithSuffix: Record<string, string>
) => {
  const prefixedKeys = Object.keys(colorsWithPrefix).sort(
    (keyA, keyB) => keyA.length - keyB.length
  );

  for (const key of prefixedKeys) {
    if (colorsWithPrefix[key] === THEME_COLORS_INHERIT_VALUE) {
      inheritColorFromParent(colorsWithPrefix, prefixedKeys, key);
    }
  }

  for (const key in colorsWithPrefix) {
    if (
      colorsWithPrefix[key] in colorsWithSuffix &&
      key !== colorsWithPrefix[key]
    ) {
      setColorByReference(colorsWithPrefix, colorsWithSuffix, key);
    }
  }
};

const makeFlatColorsWithPrefix = (colors: ThemeColors) => {
  const colorsWithSuffix = makeFlatColorsWithSuffix(colors);

  const colorsWithPrefix = Object.fromEntries(
    Object.entries(colorsWithSuffix).map(([key, value]) => {
      const keyArr = key.split(THEME_COLORS_VARIANT_KEY_PREFIX);

      let newKey = keyArr.shift() as string;

      if (keyArr.length) {
        // has variants
        keyArr.reverse();
        newKey = `${keyArr.join(THEME_COLORS_VARIANT_KEY_PREFIX)}:${newKey}`;
      }

      return [newKey, value];
    })
  );

  fillColorValues(colorsWithPrefix, colorsWithSuffix);

  return colorsWithPrefix;
};

const makeDynamicColors = (colors: ThemeColors) => {
  const flatColorsEntries = Object.entries(makeFlatColorsWithPrefix(colors));

  return flatColorsEntries
    .map(([key, value]) => {
      const keyArr: string[] = key.split(THEME_COLORS_VARIANT_KEY_PREFIX);

      const colorName = keyArr.pop() as string;

      if (!keyArr.length) {
        return { colorName, variantGroups: { ["" as string]: value } };
      }

      keyArr.reverse();
      const modifiers = (keyArr.join(":") + ":").toLowerCase();

      return { colorName, variantGroups: { [modifiers]: value } };
    })
    .filter((item, i, arr) => {
      // merge variants of the same color name

      if (!i) {
        return true;
      }

      const previousItemOfSameName = arr
        .slice(0, i)
        .find(({ colorName }) => colorName === item.colorName);

      if (!previousItemOfSameName) {
        return true;
      }

      const [variantGroup, variantGroupValue] = Object.entries(
        item.variantGroups
      )[0];

      previousItemOfSameName.variantGroups[variantGroup] = variantGroupValue;

      return false;
    });
};

let attributifyPrefix: string | null | undefined;

const setAttributifyPrefix = ({ generator }: RuleContext) => {
  const attributifyConfig = generator.config.presets
    ?.flat()
    ?.find(({ name }) => name === "@unocss/preset-attributify");

  if (attributifyConfig) {
    const { prefix } = attributifyConfig.options as AttributifyOptions;
    attributifyPrefix = prefix || null;
  } else {
    attributifyPrefix = null;
  }
};

const makeDynamicColorsShortcuts = (colors: ThemeColors) =>
  makeDynamicColors(colors).map(({ colorName, variantGroups }) => {
    const reg = new RegExp(
      [
        "^",
        `( [ ${REG_COMMON_CLASS_CHARS} \\( ] + )`,
        "( [ ^ 0-9 a-z A-Z \\] \\/ ] )",
        colorName,
        "( ( \\] ) | ( \\/ \\d+ ) ) ?",
        `( \\s ( [ ${REG_COMMON_CLASS_CHARS} ] + ) \\) ) ?`,
        "$",
      ]
        .join("")
        .replaceAll(" ", "")
    );

    const variantGroupsEntries = Object.entries(variantGroups).map(
      ([prefix, color]) => [
        prefix,
        color.replaceAll(" ", "_"), // handle whitespaces
      ]
    );

    const ifArbitraryReg = new RegExp(`\\[(.*)${colorName}(.*)\\]`);

    return [
      reg,
      ({ input }: RegExpMatchArray, context: RuleContext) => {
        if (attributifyPrefix === undefined) {
          setAttributifyPrefix(context);
        }

        if (
          !input ||
          input.startsWith(colorName) ||
          input.startsWith("[" + colorName) ||
          (attributifyPrefix && input.startsWith(attributifyPrefix))
        ) {
          return "";
        }

        const isArbitrary = ifArbitraryReg.test(input);

        return variantGroupsEntries
          .map(
            ([prefix, color]) =>
              `${prefix}${input.replaceAll(
                colorName,
                isArbitrary ? color : `[${color}]`
              )}`
          )
          .join(" ");
      },
    ] as DynamicShortcut;
  });

const presetBetterNestedColors = () => {
  const shortcuts: DynamicShortcut[] = [];

  const preset: Preset<UserTheme> = {
    name: "unocss-preset-colors-with-variants",
    shortcuts,
  };

  preset.extendTheme = (theme) => {
    if (!theme.colors) {
      return;
    }

    shortcuts.push(...makeDynamicColorsShortcuts(theme.colors));
    theme.colors = {};
  };

  return preset;
};

export { presetBetterNestedColors };
