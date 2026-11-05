import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Spinner } from './spinner'

type SortDirection = 'asc' | 'desc'
type SortConfig = { key: string; direction: SortDirection } | null

export interface DataTableColumn<T> {
  id: string
  heading: string
  cell: (item: T, index: number) => React.ReactNode
  orderable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
  footer?: React.ReactNode
}

export interface DataTableCollection<T> {
  items: T[]
  itemToValue: (item: T) => string | number
  itemToString: (item: T) => string
}

interface DataTableProps<T> {
  id?: string
  collection: DataTableCollection<T>
  columns: DataTableColumn<T>[]
  onRowClick?: (item: T) => void
  loading?: boolean
  emptyMessage?: string
}

const alignClass = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

function getSortableValue<T>(item: T, key: string): string | number {
  return ((item as Record<string, unknown>)[key] as string | number) ?? ''
}

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

function DataTableComponent<T>({
  id,
  collection,
  columns,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null)

  const handleSort = (columnId: string) => {
    setSortConfig((prev) => {
      if (prev?.key === columnId) {
        return {
          key: columnId,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        }
      }
      return { key: columnId, direction: 'asc' }
    })
  }

  const sortedItems = useMemo(() => {
    if (!sortConfig) return collection.items
    const column = columns.find((col) => col.id === sortConfig.key)
    if (!column?.orderable) return collection.items
    return [...collection.items].sort((a, b) => {
      const aVal = getSortableValue(a, sortConfig.key)
      const bVal = getSortableValue(b, sortConfig.key)
      const cmp = compareValues(aVal, bVal)
      return sortConfig.direction === 'asc' ? cmp : -cmp
    })
  }, [collection.items, sortConfig, columns])

  const empty = !loading && collection.items.length === 0

  return (
    <div className="rounded-card bg-card shadow-card overflow-hidden md:overflow-x-auto">
      <table id={id} className="block w-full text-sm md:table md:min-w-162.5">
        <thead className="hidden md:table-header-group">
          <tr className="border-b border-gray-200 bg-slate-50">
            {columns.map((column, colIdx) => (
              <th
                key={column.id}
                style={{
                  width:
                    column.width ?? (column.id === 'actions' ? 64 : undefined),
                  minWidth: column.id === 'actions' ? 64 : undefined,
                  maxWidth: colIdx === 0 && !column.width ? 360 : undefined,
                }}
                className={cn(
                  'bg-surface h-10 px-4 text-sm font-medium whitespace-nowrap text-slate-600',
                  alignClass[column.align ?? 'left'],
                  column.orderable && 'cursor-pointer select-none',
                  column.id === 'actions' &&
                    'border-border/60 sticky right-0 z-20 border-l shadow-[-5px_0_8px_-8px_rgba(16,16,16,0.3)]'
                )}
                onClick={
                  column.orderable ? () => handleSort(column.id) : undefined
                }
              >
                <span className="inline-flex items-center gap-1">
                  {column.heading}
                  {column.orderable && (
                    <span className="-gap-1 inline-flex flex-col">
                      <ChevronUp
                        size={12}
                        className={cn(
                          sortConfig?.key === column.id &&
                            sortConfig.direction === 'asc'
                            ? 'text-foreground'
                            : 'text-muted-foreground/40'
                        )}
                      />
                      <ChevronDown
                        size={12}
                        className={cn(
                          sortConfig?.key === column.id &&
                            sortConfig.direction === 'desc'
                            ? 'text-foreground'
                            : 'text-muted-foreground/40'
                        )}
                      />
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="flex w-full flex-col md:table-row-group">
          {loading ? (
            <tr className="flex w-full md:table-row">
              <td
                colSpan={columns.length}
                className="flex w-full items-center justify-center py-8 text-center md:table-cell md:w-auto"
              >
                <div className="flex justify-center">
                  <Spinner />
                </div>
              </td>
            </tr>
          ) : empty ? (
            <tr className="flex w-full md:table-row">
              <td
                colSpan={columns.length}
                className="text-muted-foreground flex w-full items-center justify-center py-8 text-center md:table-cell md:w-auto"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedItems.map((item, idx) => {
              const key = collection.itemToValue(item)
              const ariaLabel = collection.itemToString(item)
              const isLast = idx === sortedItems.length - 1
              return (
                <tr
                  key={key}
                  aria-label={ariaLabel}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={cn(
                    'bg-card flex flex-col overflow-hidden md:table-row',
                    !isLast && 'border-border/60 border-b',
                    'hover:bg-card',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((column, colIdx) => {
                    const Tag = colIdx === 0 ? 'th' : 'td'
                    return (
                      <Tag
                        key={column.id}
                        data-label={column.heading}
                        scope={colIdx === 0 ? 'row' : undefined}
                        style={{
                          width:
                            column.width ??
                            (column.id === 'actions' ? 64 : undefined),
                          minWidth: column.id === 'actions' ? 64 : undefined,
                        }}
                        className={cn(
                          'border-border/50 before:text-text-tertiary flex min-h-11 items-center justify-between gap-4 border-b px-3 py-2.5 text-right font-normal before:text-left before:text-xs before:font-medium before:tracking-wide before:uppercase before:content-[attr(data-label)] last:border-b-0 md:table-cell md:border-b-0 md:px-4 md:py-3 md:whitespace-nowrap md:before:hidden',
                          alignClass[column.align ?? 'left'],
                          colIdx === 0 && !column.width && 'md:truncate',
                          !column.heading && 'justify-end before:hidden',
                          column.id === 'actions' &&
                            'border-border/60 bg-card md:sticky md:right-0 md:z-10 md:border-l md:shadow-[-5px_0_8px_-8px_rgba(16,16,16,0.3)]'
                        )}
                      >
                        {column.cell(item, idx)}
                      </Tag>
                    )
                  })}
                </tr>
              )
            })
          )}
        </tbody>
        {!loading &&
          !empty &&
          columns.some((column) => column.footer !== undefined) && (
            <tfoot className="hidden border-t-2 md:table-footer-group">
              <tr>
                {columns.map((column) => (
                  <td
                    key={column.id}
                    style={{
                      width:
                        column.width ??
                        (column.id === 'actions' ? 64 : undefined),
                      minWidth: column.id === 'actions' ? 64 : undefined,
                    }}
                    className={cn(
                      'bg-surface px-4 py-3 font-semibold whitespace-nowrap',
                      alignClass[column.align ?? 'left'],
                      column.id === 'actions' &&
                        'border-border/60 sticky right-0 z-10 border-l shadow-[-5px_0_8px_-8px_rgba(16,16,16,0.3)]'
                    )}
                  >
                    {column.footer}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
      </table>
    </div>
  )
}

DataTableComponent.collection = <T,>({
  items,
  itemToValue,
  itemToString,
}: {
  items: T[]
  itemToValue: (item: T) => string | number
  itemToString: (item: T) => string
}): DataTableCollection<T> => ({ items, itemToValue, itemToString })

export const DataTable = DataTableComponent
