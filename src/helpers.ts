export const isObj = (value: unknown): value is Record<string, unknown> =>
  value === Object(value) && !Array.isArray(value)

export const isStr = (value: unknown): value is string =>
  typeof value === 'string'

export const kebabize = (str: string) =>
  str
    .replaceAll(/[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g, (match) => '-' + match)
    .toLowerCase()
