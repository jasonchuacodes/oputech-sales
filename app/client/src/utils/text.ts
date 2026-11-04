/**
 * Formats a string of digits according to a pattern
 *
 * @param value - The input string, which may contain non-digit characters
 * @param pattern - The pattern to apply. Use '9' as a placeholder for digits (e.g., '999-999-999')
 * @returns An object containing:
 * - `formatted`: the masked string
 * - `raw`: the cleaned and sliced raw numerical input
 */
export const formatDigitsWithPattern = (value: string, pattern: string) => {
  const digits = value.replace(/\D/g, '')
  const maxRawLength = (pattern.match(/9/g) || []).length
  const sliced = digits.slice(0, maxRawLength)

  let digitIndex = 0
  let formatted = ''

  for (const char of pattern) {
    if (char === '9') {
      if (digitIndex < sliced.length) {
        formatted += sliced[digitIndex]
        digitIndex++
      }
    } else {
      if (digitIndex < sliced.length) {
        formatted += char
      }
    }
  }

  return { formatted, raw: sliced }
}

/**
 * Converts a string to TitleCase.
 * Capitalizes the first letter and lowercases the rest.
 *
 * @param str - The input string (optional).
 * @returns A string in TitleCase, or an empty string if undefined
 *
 * @example toTitleCase("admin") // "Admin"
 */
export const toTitleCase = (str: string | undefined): string => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}
