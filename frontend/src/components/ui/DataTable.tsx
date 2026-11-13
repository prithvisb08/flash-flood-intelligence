import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  selectedRowKey?: any;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
  density?: 'compact' | 'comfortable';
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  onRowClick,
  selectedRowKey,
  defaultSortKey,
  defaultSortDir = 'asc',
  density: initialDensity = 'compact',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);
  const [density, setDensity] = useState<'compact' | 'comfortable'>(initialDensity);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const valA = a[sortKey];
    const valB = b[sortKey];

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDir === 'asc' ? valA - valB : valB - valA;
    }
    const strA = String(valA ?? '').toLowerCase();
    const strB = String(valB ?? '').toLowerCase();
    if (strA < strB) return sortDir === 'asc' ? -1 : 1;
    if (strA > strB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const rowPadding = density === 'compact' ? 'py-1.5 px-2.5' : 'py-2.5 px-3';

  return (
    <div className="w-full flex flex-col border border-rule rounded-lg bg-paper-2 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-rule bg-paper-3 text-xs text-muted">
        <span>{data.length} registered catchments</span>
        <div className="flex items-center gap-1">
          <span className="text-muted">Density:</span>
          <button
            type="button"
            onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
            className="px-2 py-0.5 rounded bg-paper-2 hover:bg-paper border border-rule text-ink transition-colors focus-visible:outline-2 focus-visible:outline-accent"
          >
            {density === 'compact' ? 'Compact' : 'Comfortable'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[540px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-paper-3 border-b border-rule z-10 text-muted font-medium">
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const colKey = String(col.key);
                return (
                  <th
                    key={colKey}
                    style={{ width: col.width }}
                    className={`py-2 px-2.5 font-medium whitespace-nowrap ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    } ${col.sortable ? 'cursor-pointer hover:text-ink select-none' : ''}`}
                    onClick={() => col.sortable && handleSort(colKey)}
                  >
                    <div
                      className={`inline-flex items-center gap-1 ${
                        col.align === 'right' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-muted">
                          {isSorted ? (
                            sortDir === 'asc' ? (
                              <ArrowUp size={12} className="text-accent" />
                            ) : (
                              <ArrowDown size={12} className="text-accent" />
                            )
                          ) : (
                            <ArrowUpDown size={12} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule text-ink">
            {sortedData.map((row) => {
              const rowKey = row[keyField];
              const isSelected = selectedRowKey !== undefined && selectedRowKey === rowKey;
              return (
                <tr
                  key={String(rowKey)}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-paper-3 font-medium'
                      : 'hover:bg-paper-3'
                  }`}
                >
                  {columns.map((col) => {
                    const colKey = String(col.key);
                    return (
                      <td
                        key={colKey}
                        className={`${rowPadding} whitespace-nowrap ${
                          col.align === 'right'
                            ? 'text-right num'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
