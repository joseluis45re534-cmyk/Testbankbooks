import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type Column<T> = {
  key: string;
  label: string;
  /** What the column sorts by and exports to CSV. */
  value: (row: T) => number | string | null;
  /** What the cell shows; defaults to the value. */
  render?: (row: T) => ReactNode;
  numeric?: boolean;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  defaultSort: string;
  defaultDirection?: "asc" | "desc";
  csvName: string;
  emptyText?: string;
  pageSize?: number;
  footer?: ReactNode;
};

function toCsv<T>(rows: T[], columns: Column<T>[]): string {
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    columns.map((c) => cell(c.label)).join(","),
    ...rows.map((row) => columns.map((c) => cell(c.value(row))).join(",")),
  ].join("\n");
}

/** A table that sorts on any column header click and exports what it shows to CSV. */
export function AnalyticsTable<T>({
  rows,
  columns,
  defaultSort,
  defaultDirection = "desc",
  csvName,
  emptyText = "No data for this period yet.",
  pageSize = 10,
  footer,
}: Props<T>) {
  const [sortKey, setSortKey] = useState(defaultSort);
  const [direction, setDirection] = useState(defaultDirection);
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sortKey) ?? columns[0];
    const factor = direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = column.value(a);
      const y = column.value(b);
      if (typeof x === "number" || typeof y === "number") return ((Number(x) || 0) - (Number(y) || 0)) * factor;
      return String(x ?? "").localeCompare(String(y ?? "")) * factor;
    });
  }, [rows, columns, sortKey, direction]);

  const sortBy = (column: Column<T>) => {
    if (column.key === sortKey) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSortKey(column.key);
      setDirection(column.numeric ? "desc" : "asc");
    }
  };

  const downloadCsv = () => {
    const url = URL.createObjectURL(new Blob([toCsv(sorted, columns)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${csvName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }

  const visible = expanded ? sorted : sorted.slice(0, pageSize);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => {
                const active = column.key === sortKey;
                const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;
                return (
                  <TableHead key={column.key} className={`whitespace-nowrap ${column.numeric ? "text-right" : ""}`}>
                    <button
                      type="button"
                      onClick={() => sortBy(column)}
                      className={`inline-flex items-center gap-1 hover:text-foreground ${active ? "font-semibold text-foreground" : ""}`}
                      data-testid={`sort-${csvName}-${column.key}`}
                    >
                      {column.label}
                      <Icon className={`h-3 w-3 ${active ? "" : "opacity-40"}`} />
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row, i) => (
              <TableRow key={i}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.numeric ? "text-right tabular-nums" : ""}>
                    {column.render ? column.render(row) : column.value(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {footer && <TableFooter>{footer}</TableFooter>}
        </Table>
      </div>
      <div className="flex items-center justify-between gap-2">
        {sorted.length > pageSize ? (
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Show less" : `Show all ${sorted.length}`}
          </Button>
        ) : (
          <span />
        )}
        <Button variant="outline" size="sm" onClick={downloadCsv} data-testid={`button-csv-${csvName}`}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}

export function TotalsRow({ cells }: { cells: { value: ReactNode; numeric?: boolean }[] }) {
  return (
    <TableRow>
      {cells.map((cell, i) => (
        <TableCell key={i} className={`font-semibold ${cell.numeric ? "text-right tabular-nums" : ""}`}>
          {cell.value}
        </TableCell>
      ))}
    </TableRow>
  );
}
