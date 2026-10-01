import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import createGlobe, { type Globe } from 'cobe';
import type { RegionalAnalysisData } from '../../lib/api';

interface RegionMarker {
  location: [number, number];
  size: number;
  region: string;
}

const REGION_COORDS: Record<string, [number, number]> = {
  EAC: [-1.2921, 36.8219],
  ECOWAS: [7.3697, -1.663],
  SADC: [-29.0852, 26.1596],
};

function getTierColor(score: number): [number, number, number] {
  if (score >= 60) return [0.22, 0.75, 0.42];
  if (score >= 40) return [0.95, 0.75, 0.1];
  return [0.85, 0.22, 0.22];
}

function getRegionCoords(region: string): [number, number] | null {
  const direct = REGION_COORDS[region];
  if (direct) return direct;
  const key = Object.keys(REGION_COORDS).find(
    (k) =>
      region.toLowerCase().includes(k.toLowerCase()) ||
      k.toLowerCase().includes(region.toLowerCase())
  );
  return key ? REGION_COORDS[key] : null;
}

interface AfricaGlobeProps {
  data: RegionalAnalysisData[];
  selectedRegion: RegionalAnalysisData | null;
  onRegionSelect: (region: RegionalAnalysisData | null) => void;
}

export function AfricaGlobe({ data, selectedRegion, onRegionSelect }: AfricaGlobeProps) {
  const { t } = useTranslation('scorecard');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeRef = useRef<Globe | null>(null);
  const pointerInteracting = useRef<number | null>(null);
  const phiRef = useRef(-0.3);
  const rafRef = useRef<number>(0);
  const lastClickPos = useRef<{ x: number; y: number } | null>(null);

  const markers: RegionMarker[] = data
    .map((d) => {
      const coords = getRegionCoords(d.region);
      if (!coords) return null;
      return { location: coords, size: 0.08, region: d.region };
    })
    .filter(Boolean) as RegionMarker[];

  const getMarkerColor = useCallback((): [number, number, number] => {
    const firstMarker = markers[0];
    if (!firstMarker) return [1, 0.5, 0.2];
    const regionData = data.find((d) => d.region === firstMarker.region);
    return getTierColor(regionData?.averageCompositeScore ?? 0);
  }, [data, markers]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = canvas.offsetWidth || 400;

    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio, 2),
      width: width * 2,
      height: width * 2,
      phi: phiRef.current,
      theta: 0.25,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.96, 0.93, 0.86],
      markerColor: getMarkerColor(),
      glowColor: [1, 1, 1],
      scale: 1,
      markers: markers.map((m) => ({ location: m.location, size: m.size })),
    });

    globeRef.current = globe;
    canvas.style.opacity = '1';

    const animate = () => {
      if (!pointerInteracting.current) {
        phiRef.current += 0.003;
      }
      globe.update({ phi: phiRef.current });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      globe.destroy();
      globeRef.current = null;
    };
  }, [data]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    pointerInteracting.current = e.clientX;
    lastClickPos.current = { x: e.clientX, y: e.clientY };
    canvasRef.current!.style.cursor = 'grabbing';
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      pointerInteracting.current = null;
      canvasRef.current!.style.cursor = 'grab';

      if (lastClickPos.current) {
        const dx = Math.abs(e.clientX - lastClickPos.current.x);
        const dy = Math.abs(e.clientY - lastClickPos.current.y);
        if (dx < 4 && dy < 4) {
          const canvas = canvasRef.current!;
          const rect = canvas.getBoundingClientRect();
          const cx = (e.clientX - rect.left) / rect.width;
          const cy = (e.clientY - rect.top) / rect.height;

          const closestMarker = findClosestMarker(cx, cy, markers, phiRef.current, 0.25);
          if (closestMarker) {
            const regionData = data.find((d) => d.region === closestMarker.region);
            if (regionData) {
              onRegionSelect(
                selectedRegion?.region === regionData.region ? null : regionData
              );
            }
          } else {
            onRegionSelect(null);
          }
        }
      }

      lastClickPos.current = null;
    },
    [data, markers, selectedRegion, onRegionSelect]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerInteracting.current !== null) {
      const delta = e.clientX - pointerInteracting.current;
      phiRef.current += delta * 0.005;
      pointerInteracting.current = e.clientX;
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-lg mx-auto aspect-square">
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            cursor: 'grab',
            opacity: 0,
            transition: 'opacity 1s ease',
          }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
          onPointerOut={() => {
            pointerInteracting.current = null;
            if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
          }}
        />

        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {markers.map((m) => {
            const regionData = data.find((d) => d.region === m.region);
            const score = regionData?.averageCompositeScore ?? 0;
            const [r, g, b] = getTierColor(score);
            const isSelected = selectedRegion?.region === m.region;
            return (
              <button
                key={m.region}
                onClick={() => {
                  if (regionData)
                    onRegionSelect(isSelected ? null : regionData);
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-gray-900 text-white shadow-lg scale-105'
                    : 'bg-white/90 text-gray-700 hover:bg-white shadow-sm'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})` }}
                />
                <span>{m.region}</span>
                <span
                  className="font-bold ml-0.5"
                  style={{ color: `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})` }}
                >
                  {score.toFixed(1)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          {t('africaGlobe.legendProgressive')}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
          {t('africaGlobe.legendEmergent')}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary-500 inline-block" />
          {t('africaGlobe.legendRegressive')}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        {t('africaGlobe.dragHint')}
      </p>
    </div>
  );
}

function findClosestMarker(
  cx: number,
  cy: number,
  markers: RegionMarker[],
  phi: number,
  theta: number
): RegionMarker | null {
  let closest: RegionMarker | null = null;
  let minDist = 0.08;

  for (const marker of markers) {
    const [lat, lng] = marker.location;
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;

    const x3d = Math.cos(latRad) * Math.cos(lngRad);
    const y3d = Math.sin(latRad);
    const z3d = Math.cos(latRad) * Math.sin(lngRad);

    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    const xRot = x3d * cosPhi + z3d * sinPhi;
    const yRot = y3d * cosTheta - (-x3d * sinPhi + z3d * cosPhi) * sinTheta;
    const zRot = y3d * sinTheta + (-x3d * sinPhi + z3d * cosPhi) * cosTheta;

    if (zRot < 0) continue;

    const screenX = 0.5 + xRot * 0.5;
    const screenY = 0.5 - yRot * 0.5;

    const dist = Math.sqrt((cx - screenX) ** 2 + (cy - screenY) ** 2);
    if (dist < minDist) {
      minDist = dist;
      closest = marker;
    }
  }
  return closest;
}
