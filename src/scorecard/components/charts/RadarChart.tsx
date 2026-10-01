import { useTranslation } from 'react-i18next';

interface RadarChartProps {
  data: Array<{
    label: string;
    value: number;
    maxValue?: number;
  }>;
  size?: number;
  color?: string;
  compareData?: Array<{
    label: string;
    value: number;
  }>;
  compareColor?: string;
  showLabels?: boolean;
  showGrid?: boolean;
}

export function RadarChart({
  data,
  size = 400,
  color = '#DC2626',
  compareData,
  compareColor = '#2563EB',
  showLabels = true,
  showGrid = true,
}: RadarChartProps) {
  const { t } = useTranslation('scorecard');
  const center = size / 2;
  const radius = (size / 2) * 0.7;
  const angleStep = (2 * Math.PI) / data.length;
  const levels = 5;

  const polarToCartesian = (angle: number, distance: number) => {
    const x = center + distance * Math.cos(angle - Math.PI / 2);
    const y = center + distance * Math.sin(angle - Math.PI / 2);
    return { x, y };
  };

  const getPath = (values: Array<{ label: string; value: number }>) => {
    const maxValue = data[0]?.maxValue || 100;
    const points = values.map((item, index) => {
      const angle = angleStep * index;
      const normalizedValue = (item.value / maxValue) * radius;
      return polarToCartesian(angle, normalizedValue);
    });

    return (
      points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ') +
      ' Z'
    );
  };

  const gridLevels = Array.from({ length: levels }, (_, i) => {
    const levelRadius = (radius / levels) * (i + 1);
    const points = data.map((_, index) => {
      const angle = angleStep * index;
      return polarToCartesian(angle, levelRadius);
    });
    return points;
  });

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {showGrid && (
          <g className="grid">
            {gridLevels.map((points, levelIndex) => (
              <path
                key={`grid-${levelIndex}`}
                d={
                  points
                    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`)
                    .join(' ') + ' Z'
                }
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="1"
                opacity={0.5}
              />
            ))}
            {data.map((_, index) => {
              const angle = angleStep * index;
              const end = polarToCartesian(angle, radius);
              return (
                <line
                  key={`axis-${index}`}
                  x1={center}
                  y1={center}
                  x2={end.x}
                  y2={end.y}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                  opacity={0.5}
                />
              );
            })}
          </g>
        )}

        {compareData && (
          <g className="compare-data">
            <path
              d={getPath(compareData)}
              fill={compareColor}
              fillOpacity={0.1}
              stroke={compareColor}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {compareData.map((item, index) => {
              const angle = angleStep * index;
              const maxValue = data[0]?.maxValue || 100;
              const normalizedValue = (item.value / maxValue) * radius;
              const point = polarToCartesian(angle, normalizedValue);
              return (
                <circle
                  key={`compare-point-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill={compareColor}
                  stroke="white"
                  strokeWidth="2"
                />
              );
            })}
          </g>
        )}

        <g className="main-data">
          <path
            d={getPath(data)}
            fill={color}
            fillOpacity={0.2}
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {data.map((item, index) => {
            const angle = angleStep * index;
            const maxValue = item.maxValue || 100;
            const normalizedValue = (item.value / maxValue) * radius;
            const point = polarToCartesian(angle, normalizedValue);
            return (
              <circle
                key={`point-${index}`}
                cx={point.x}
                cy={point.y}
                r="4"
                fill={color}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        </g>

        {showLabels && (
          <g className="labels">
            {data.map((item, index) => {
              const angle = angleStep * index;
              const labelDistance = radius + 40;
              const point = polarToCartesian(angle, labelDistance);

              let textAnchor: 'start' | 'middle' | 'end' = 'middle';
              let dy = '0.3em';

              if (point.x < center - 5) {
                textAnchor = 'end';
              } else if (point.x > center + 5) {
                textAnchor = 'start';
              }

              if (point.y < center - 5) {
                dy = '0em';
              } else if (point.y > center + 5) {
                dy = '1em';
              }

              return (
                <g key={`label-${index}`}>
                  <text
                    x={point.x}
                    y={point.y}
                    textAnchor={textAnchor}
                    dy={dy}
                    className="text-xs font-semibold fill-gray-700"
                  >
                    {item.label}
                  </text>
                  <text
                    x={point.x}
                    y={point.y + 14}
                    textAnchor={textAnchor}
                    dy={dy}
                    className="text-xs fill-gray-500"
                  >
                    {item.value.toFixed(1)}%
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {compareData && (
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: color }}
            ></div>
            <span className="text-sm text-gray-700">{t('radarChart.primary')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: compareColor }}
            ></div>
            <span className="text-sm text-gray-700">{t('radarChart.compare')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

