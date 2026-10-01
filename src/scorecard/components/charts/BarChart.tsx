import { useState } from 'react';

export interface BarChartData {
  label: string;
  value: number;
  color?: string;
  metadata?: any;
}

interface BarChartProps {
  data: BarChartData[];
  title?: string;
  maxValue?: number;
  height?: number;
  onBarClick?: (item: BarChartData) => void;
  showValues?: boolean;
}

export function BarChart({
  data,
  title,
  maxValue,
  height = 400,
  onBarClick,
  showValues = true,
}: BarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const max = maxValue || Math.max(...data.map((d) => d.value), 100);
  const chartHeight = height - 60;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {title && <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>}

      <div className="relative" style={{ height: `${height}px` }}>
        <div className="flex items-end justify-between h-full gap-2">
          {data.map((item, index) => {
            const barHeight = (item.value / max) * chartHeight;
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={index}
                className="flex flex-col items-center flex-1 relative"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex-1 flex items-end w-full">
                  <div className="w-full flex flex-col items-center">
                    {showValues && (
                      <div
                        className={`text-xs font-medium mb-1 transition-opacity ${
                          isHovered ? 'opacity-100' : 'opacity-70'
                        }`}
                      >
                        {item.value.toFixed(1)}
                      </div>
                    )}
                    <div
                      className={`w-full rounded-t transition-all ${
                        onBarClick ? 'cursor-pointer hover:opacity-80' : ''
                      } ${isHovered ? 'shadow-lg' : ''}`}
                      style={{
                        height: `${barHeight}px`,
                        backgroundColor: item.color || '#3B82F6',
                      }}
                      onClick={() => onBarClick?.(item)}
                    />
                  </div>
                </div>

                <div className="mt-2 text-xs text-gray-600 text-center max-w-full overflow-hidden">
                  <div className="truncate" title={item.label}>
                    {item.label}
                  </div>
                </div>

                {isHovered && (
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-sm whitespace-nowrap z-10">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-gray-300">{item.value.toFixed(2)}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-300" />
      </div>
    </div>
  );
}
