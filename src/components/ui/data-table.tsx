"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Inbox,
  Search,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type DataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
};

type SortState = { id: string; dir: "asc" | "desc" } | null;

type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
  pageSize?: number;
  rowActions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  footer?: ReactNode;
};

export function DataTable<T>({
  data,
  columns,
  getRowId,
  searchText,
  searchPlaceholder = "Cerca…",
  toolbar,
  pageSize = 10,
  rowActions,
  onRowClick,
  emptyTitle = "Nessun risultato",
  emptyDescription = "Prova a modificare la ricerca o i filtri applicati.",
  emptyAction,
  footer,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let rows = data;
    if (query.trim() && searchText) {
      const needle = query.trim().toLowerCase();
      rows = rows.filter((row) =>
        searchText(row).toLowerCase().includes(needle),
      );
    }
    if (sort) {
      const column = columns.find((entry) => entry.id === sort.id);
      if (column?.sortValue) {
        const sortValue = column.sortValue;
        rows = [...rows].sort((a, b) => {
          const av = sortValue(a);
          const bv = sortValue(b);
          const comparison =
            typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv), "it");
          return sort.dir === "asc" ? comparison : -comparison;
        });
      }
    }
    return rows;
  }, [data, query, sort, columns, searchText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const start = currentPage * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const rangeStart = filtered.length === 0 ? 0 : start + 1;
  const rangeEnd = Math.min(start + pageSize, filtered.length);

  const toggleSort = (id: string) => {
    setPage(0);
    setSort((current) => {
      if (!current || current.id !== id) return { id, dir: "asc" };
      return { id, dir: current.dir === "asc" ? "desc" : "asc" };
    });
  };

  return (
    <div className="overflow-hidden rounded-card border border-zinc-200 bg-white shadow-card dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-2 border-b border-zinc-100 p-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        {searchText ? (
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder}
              className="pl-9"
              aria-label={searchPlaceholder}
            />
          </div>
        ) : (
          <div />
        )}
        {toolbar ? (
          <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  aria-sort={
                    column.sortValue
                      ? sort?.id === column.id
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                      : undefined
                  }
                  className={cn(column.headerClassName)}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.id)}
                      className="inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
                    >
                      {column.header}
                      <ChevronsUpDown
                        className={cn(
                          "size-3",
                          sort?.id === column.id
                            ? "text-zinc-800 dark:text-zinc-200"
                            : "text-zinc-300 dark:text-zinc-600",
                        )}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
              {rowActions ? (
                <TableHead className="w-10">
                  <span className="sr-only">Azioni</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {columns.map((column) => (
                  <TableCell key={column.id} className={cn(column.className)}>
                    {column.cell(row)}
                  </TableCell>
                ))}
                {rowActions ? (
                  <TableCell className="w-10 text-right">
                    {rowActions(row)}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex flex-col gap-2 border-t border-zinc-100 px-3 py-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite">
          Risultati {rangeStart}–{rangeEnd} di {filtered.length}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={currentPage === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            aria-label="Pagina precedente"
          >
            <ChevronLeft />
          </Button>
          <span className="px-2 tabular-nums">
            {currentPage + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={currentPage >= totalPages - 1}
            onClick={() =>
              setPage((value) => Math.min(totalPages - 1, value + 1))
            }
            aria-label="Pagina successiva"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      {footer}
    </div>
  );
}
