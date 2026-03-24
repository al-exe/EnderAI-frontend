import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type { CSSProperties, Ref } from "react"

import { SplitScrollableTable } from "@/components/Common/SplitScrollableTable"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface SplitDataTableColumnMeta {
  width?: string
  headerClassName?: string
  cellClassName?: string
}

interface SplitDataTableProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  getRowId?: (originalRow: TData, index: number) => string
  selectedRowId?: string | null
  onRowClick?: (row: TData) => void
  getRowClassName?: (row: TData, selected: boolean) => string | undefined
  viewportRef?: Ref<HTMLDivElement | null>
  loadMoreRef?: Ref<HTMLDivElement | null>
  hasMore?: boolean
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (!ref) return
  if (typeof ref === "function") {
    ref(value)
    return
  }
  ref.current = value
}

function getColumnMeta<TData>(
  column: ColumnDef<TData>,
): SplitDataTableColumnMeta | undefined {
  return column.meta as SplitDataTableColumnMeta | undefined
}

function buildTableStyle<TData>(
  columns: ColumnDef<TData>[],
): CSSProperties | undefined {
  const widths = columns
    .map((column) => getColumnMeta(column)?.width)
    .filter((width): width is string => Boolean(width))

  if (widths.length !== columns.length) return undefined

  return {
    width: `max(100%, calc(${widths.join(" + ")}))`,
  }
}

export function SplitDataTable<TData>({
  columns,
  data,
  getRowId,
  selectedRowId,
  onRowClick,
  getRowClassName,
  viewportRef,
  loadMoreRef,
  hasMore,
}: SplitDataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  })

  const tableStyle = buildTableStyle(columns)

  return (
    <SplitScrollableTable
      viewportRef={viewportRef}
      header={
        <table
          className="caption-bottom text-sm table-fixed"
          style={tableStyle}
        >
          <colgroup>
            {columns.map((column) => (
              <col
                key={
                  column.id ??
                  String("accessorKey" in column ? column.accessorKey : "")
                }
                style={{ width: getColumnMeta(column)?.width }}
              />
            ))}
          </colgroup>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b-0">
                {headerGroup.headers.map((header) => {
                  const meta = getColumnMeta(header.column.columnDef)
                  return (
                    <TableHead
                      key={header.id}
                      className={meta?.headerClassName}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
        </table>
      }
      body={
        <>
          <table
            className="caption-bottom text-sm table-fixed"
            style={tableStyle}
          >
            <colgroup>
              {columns.map((column) => (
                <col
                  key={
                    column.id ??
                    String("accessorKey" in column ? column.accessorKey : "")
                  }
                  style={{ width: getColumnMeta(column)?.width }}
                />
              ))}
            </colgroup>
            <TableBody>
              {table.getRowModel().rows.map((row) => {
                const selected = selectedRowId === row.id
                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      onRowClick ? "cursor-pointer" : undefined,
                      selected ? "bg-muted/50" : undefined,
                      getRowClassName?.(row.original, selected),
                    )}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = getColumnMeta(cell.column.columnDef)
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(meta?.cellClassName)}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>
          </table>
          {hasMore ? (
            <div ref={(node) => assignRef(loadMoreRef, node)} className="h-4" />
          ) : null}
        </>
      }
    />
  )
}
