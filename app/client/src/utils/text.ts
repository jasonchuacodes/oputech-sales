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
