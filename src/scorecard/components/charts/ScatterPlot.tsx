import { useState } from 'react';

export interface ScatterPlotPoint {
  x: number;
  y: number;
  label: string;
  color?: string;
  metadata?: any;
}

interface ScatterPlotProps {
  data: ScatterPlotPoint[];
  title?: string;
  xLabel?: string;
  yLabel?: string;
  width?: number;
  height?: number;
  onPointClick?: (point: ScatterPlotPoint) => void;
}

export function ScatterPlot({
  data,
  title,
  xLabel = 'X Axis',
  yLabel = 'Y Axis',
  width = 600,
  height = 400,
  onPointClick,
}: ScatterPlotProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const padding = 60;
  const plotWidth = width - 2 * padding;
  const plotHeight = height - 2 * padding;

  const xValues = data.map((d) => d.x);
  const yValues = data.map((d) => d.y);

  const xMin = Math.min(...xValues, 0);
  const xMax = Math.max(...xValues, 100);
  const yMin = Math.min(...yValues, 0);
  const yMax = Math.max(...yValues, 100);

  const xScale = (value: number) => ((value - xMin) / (xMax - xMin)) * plotWidth + padding;
  const yScale = (value: number) => height - padding - ((value - yMin) / (yMax - yMin)) * plotHeight;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {title && <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>}

      <svg width={width} height={height} className="overflow-visible">
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#D1D5DB"
          strokeWidth="2"
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="#D1D5DB"
          strokeWidth="2"
        />

        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          className="text-sm fill-gray-600"
        >
          {xLabel}
        </text>

        <text
          x={-height / 2}
          y={20}
          textAnchor="middle"
          transform={`rotate(-90, 20, ${height / 2})`}
          className="text-sm fill-gray-600"
        >
          {yLabel}
        </text>

        {data.map((point, index) => {
          const cx = xScale(point.x);
          const cy = yScale(point.y);
          const isHovered = hoveredIndex === index;

          return (
            <g key={index}>
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 8 : 6}
                fill={point.color || '#3B82F6'}
                className={`transition-all ${
                  onPointClick ? 'cursor-pointer hover:opacity-80' : ''
                }`}
                opacity={isHovered ? 1 : 0.7}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onPointClick?.(point)}
              />

              {isHovered && (
                <>
                  <rect
                    x={cx + 10}
                    y={cy - 30}
                    width="120"
                    height="50"
                    fill="#1F2937"
                    rx="4"
                    className="pointer-events-none"
                  />
                  <text
                    x={cx + 70}
                    y={cy - 15}
                    textAnchor="middle"
                    className="text-xs fill-white font-medium pointer-events-none"
                  >
                    {point.label}
                  </text>
                  <text
                    x={cx + 70}
                    y={cy - 2}
                    textAnchor="middle"
                    className="text-xs fill-gray-300 pointer-events-none"
                  >
                    {`(${point.x.toFixed(1)}, ${point.y.toFixed(1)})`}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
