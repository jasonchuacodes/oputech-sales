export const formatNumber = (
  value: number | string,
  decimals: number = 2,
  digits?: number
): string => {
  const num = Number(value)

  if (Number.isNaN(num)) return '0.00'

  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    ...(digits != null && { minimumIntegerDigits: digits }),
  })
}

export const formatCurrency = (
  value: number | undefined,
  symbol: string = '₱',
  decimals: number = 2
): string => {
  if (value === undefined) return '-'
  return `${symbol}${formatNumber(value, decimals)}`
}
