export const isObj = (value: unknown): value is Record<string, unknown> =>
  value === Object(value) && !Array.isArray(value);

export const isStr = (value: unknown): value is string =>
  typeof value === "string";

export const kebabCase = (str: string) =>
  str
    .replace(/[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g, (match) => "-" + match)
    .toLowerCase();
