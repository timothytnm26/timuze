import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  columnFilteringFeature,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import type { RankedEntry } from '@/entities/stream-history'
import { Button } from '@/shared/ui'
import { cn, msToHours } from '@/shared/lib'
import { useFormatters, useTranslation, type Formatters, type TFunction } from '@/shared/i18n'

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})

type Row = RankedEntry & { rank: number }
const helper = createColumnHelper<typeof features, Row>()

const buildColumns = (showArtist: boolean, t: TFunction<['widgets/history-dashboard', 'common']>, f: Formatters) =>
  helper.columns([
    helper.accessor('rank', {
      header: '#',
      cell: (c) => <span className="font-mono text-ink-faint">{c.getValue()}</span>,
      enableGlobalFilter: false,
    }),
    helper.accessor('name', {
      header: showArtist ? t('ranking.name') : t('common:labels.artist'),
      cell: (c) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{c.getValue()}</p>
          {showArtist && <p className="truncate text-xs text-ink-muted">{c.row.original.artist}</p>}
        </div>
      ),
      sortFn: 'alphanumeric',
    }),
    ...(showArtist ? [helper.accessor('artist', { header: t('common:labels.artist'), cell: () => null })] : []),
    helper.accessor('streams', {
      header: t('common:labels.streams'),
      cell: (c) => <span className="font-mono tabular-nums">{f.number(c.getValue())}</span>,
      enableGlobalFilter: false,
    }),
    helper.accessor('ms', {
      header: t('common:labels.listeningHours'),
      cell: (c) => <span className="font-mono text-ink-muted tabular-nums">{f.decimal(msToHours(c.getValue()))}</span>,
      enableGlobalFilter: false,
    }),
  ])

const align = (id: string) => (id === 'rank' ? 'pr-3 text-center' : id === 'name' ? 'pr-4 text-left' : 'text-right')

/** Sortable, searchable, paginated ranking built on TanStack Table v9. */
export function RankingTable({ rows, showArtist }: { rows: Row[]; showArtist: boolean }) {
  const { t } = useTranslation(['widgets/history-dashboard', 'common'])
  const f = useFormatters()
  const [query, setQuery] = useState('')
  const columns = useMemo(() => buildColumns(showArtist, t, f), [showArtist, t, f])
  const table = useTable({
    features,
    data: rows,
    columns,
    globalFilterFn: 'includesString',
    initialState: {
      pagination: { pageIndex: 0, pageSize: 15 },
    },
    state: { globalFilter: query },
    onGlobalFilterChange: (u) => setQuery(typeof u === 'function' ? u(query) : u),
  })

  return (
    <div className="flex flex-col gap-4">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          table.setPageIndex(0)
        }}
        placeholder={t('ranking.search')}
        className="h-10 w-full max-w-xs rounded-full border border-line bg-surface-2 px-4 text-sm outline-none placeholder:text-ink-faint focus:border-brand"
      />
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-12" />
            <col />
            <col className="w-28" />
            <col className="w-24" />
          </colgroup>
          <thead>
            {table.getHeaderGroups().map((g) => (
              <tr key={g.id} className="border-b border-line text-left text-xs text-ink-muted">
                {g.headers
                  .filter((h) => h.column.id !== 'artist')
                  .map((h) => {
                    const sorted = h.column.getIsSorted()
                    return (
                      <th key={h.id} className={cn('py-2 font-medium', align(h.column.id))}>
                        {h.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={h.column.getToggleSortingHandler()}
                            className={cn('cursor-pointer hover:text-ink', sorted && 'text-brand')}
                          >
                            <table.FlexRender header={h} />
                            {sorted === 'asc' ? ' ↑' : sorted === 'desc' ? ' ↓' : ''}
                          </button>
                        ) : (
                          <table.FlexRender header={h} />
                        )}
                      </th>
                    )
                  })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-line/40 transition-colors hover:bg-surface-2">
                {row
                  .getAllCells()
                  .filter((c) => c.column.id !== 'artist')
                  .map((cell) => (
                    <td key={cell.id} className={cn('py-2.5', align(cell.column.id))}>
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <span>
          {t('ranking.page', { page: table.state.pagination.pageIndex + 1, total: Math.max(1, table.getPageCount()) })}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
            {t('ranking.prev')}
          </Button>
          <Button variant="outline" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
            {t('ranking.next')}
          </Button>
        </div>
      </div>
    </div>
  )
}
