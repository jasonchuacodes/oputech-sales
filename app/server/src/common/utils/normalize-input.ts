export const normalizeInput = <T extends Record<string, unknown>>(input: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== null && v !== undefined && v !== ''),
  ) as Partial<T>
