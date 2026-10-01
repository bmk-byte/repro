import { useState } from 'react';

export interface HeatMapCell {
  row: string;
  col: string;
  value: number;
  metadata?: any;
}

interface HeatMapProps {
  data: HeatMapCell[];
  title?: string;
  minValue?: number;
  maxValue?: number;
  colorScheme?: 'blue' | 'red' | 'green';
  onCellClick?: (cell: HeatMapCell) => void;
}

export function HeatMap({
  data,
  title,
  minValue,
  maxValue,
  colorScheme = 'blue',
  onCellClick,
}: HeatMapProps) {
  const [hoveredCell, setHoveredCell] = useState<HeatMapCell | null>(null);

  const rows = Array.from(new Set(data.map((d) => d.row)));
  const cols = Array.from(new Set(data.map((d) => d.col)));

  const min = minValue ?? Math.min(...data.map((d) => d.value));
  const max = maxValue ?? Math.max(...data.map((d) => d.value));

  const getColor = (value: number): string => {
    const normalized = (value - min) / (max - min);
    const intensity = Math.round(normalized * 9);

    const colorMaps = {
      blue: [
        '#EFF6FF',
        '#DBEAFE',
        '#BFDBFE',
        '#93C5FD',
        '#60A5FA',
        '#3B82F6',
        '#2563EB',
        '#1D4ED8',
        '#1E40AF',
        '#1E3A8A',
      ],
      red: [
        '#FEF2F2',
        '#FEE2E2',
        '#FECACA',
        '#FCA5A5',
        '#F87171',
        '#EF4444',
        '#DC2626',
        '#B91C1C',
        '#991B1B',
        '#7F1D1D',
      ],
      green: [
        '#F0FDF4',
        '#DCFCE7',
        '#BBF7D0',
        '#86EFAC',
        '#4ADE80',
        '#22C55E',
        '#16A34A',
        '#15803D',
        '#166534',
        '#14532D',
      ],
    };

    return colorMaps[colorScheme][intensity];
  };

  const getCellData = (row: string, col: string): HeatMapCell | undefined => {
    return data.find((d) => d.row === row && d.col === col);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 overflow-x-auto">
      {title && <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>}

      <div className="inline-block min-w-full">
        <div className="grid gap-1" style={{ gridTemplateColumns: `150px repeat(${cols.length}, 80px)` }}>
          <div />
          {cols.map((col, index) => (
            <div
              key={index}
              className="text-xs font-medium text-gray-700 text-center p-2"
              title={col}
            >
              <div className="truncate">{col}</div>
            </div>
          ))}

          {rows.map((row, rowIndex) => (
            <>
              <div
                key={`row-${rowIndex}`}
                className="text-xs font-medium text-gray-700 flex items-center p-2"
                title={row}
              >
                <div className="truncate">{row}</div>
              </div>

              {cols.map((col, colIndex) => {
                const cell = getCellData(row, col);
                const isHovered = hoveredCell === cell;

                return (
                  <div
                    key={`cell-${rowIndex}-${colIndex}`}
                    className={`relative flex items-center justify-center text-xs font-medium transition-all ${
                      onCellClick && cell ? 'cursor-pointer hover:ring-2 hover:ring-primary-500' : ''
                    } ${isHovered ? 'ring-2 ring-primary-600 z-10' : ''}`}
                    style={{
                      backgroundColor: cell ? getColor(cell.value) : '#F3F4F6',
                      color: cell && cell.value > (max - min) / 2 + min ? 'white' : '#1F2937',
                      minHeight: '60px',
                    }}
                    onMouseEnter={() => cell && setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => cell && onCellClick?.(cell)}
                  >
                    {cell ? cell.value.toFixed(2) : 'N/A'}

                    {isHovered && cell && (
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-sm whitespace-nowrap z-20">
                        <div className="font-medium">{`${cell.row} × ${cell.col}`}</div>
                        <div className="text-gray-300">Value: {cell.value.toFixed(2)}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-xs text-gray-600">Low</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div
                key={i}
                className="w-8 h-4"
                style={{
                  backgroundColor: getColor(min + (i / 9) * (max - min)),
                }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-600">High</span>
        </div>
      </div>
    </div>
  );
}
