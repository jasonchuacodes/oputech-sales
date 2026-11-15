import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DataTable, type DataTableColumn } from './data-table'

interface Item {
  id: string
  name: string
}

const items: Item[] = [{ id: 'one', name: 'One' }]
const columns: DataTableColumn<Item>[] = [
  { id: 'name', heading: 'Name', cell: (item) => item.name },
]
const collection = DataTable.collection({
  items,
  itemToValue: (item) => item.id,
  itemToString: (item) => item.name,
})

describe('DataTable transfer actions', () => {
  it('does not render transfer actions by default', () => {
    const markup = renderToStaticMarkup(
      <DataTable collection={collection} columns={columns} />
    )

    expect(markup).not.toContain('>Import<')
    expect(markup).not.toContain('>Export<')
  })

  it('renders optional import and export actions', () => {
    const markup = renderToStaticMarkup(
      <DataTable
        collection={collection}
        columns={columns}
        import={() => undefined}
        export={() => undefined}
      />
    )

    expect(markup).toContain('>Import<')
    expect(markup).toContain('>Export<')
  })

  it('renders disabled action states', () => {
    const markup = renderToStaticMarkup(
      <DataTable
        collection={collection}
        columns={columns}
        import={() => undefined}
        export={() => undefined}
        importDisabled
        exportDisabled
      />
    )

    expect(markup.match(/disabled=""/g)).toHaveLength(2)
  })
})
