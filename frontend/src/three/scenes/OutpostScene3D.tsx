import React, { useRef, useState, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SessionFacility, MissionEnvironment } from '../../types/astromission';
import { Layers, Compass, AlertTriangle, CheckCircle2, PlusCircle } from 'lucide-react';

interface OutpostSceneProps {
  planet: 'moon' | 'mars';
  facilities: SessionFacility[];
  environment: MissionEnvironment;
  selectedFacilityId: string | null;
  onSelectFacility: (id: string | null) => void;
  placementFacilityType: string | null;
  onPlaceFacilityAt: (gridX: number, gridZ: number) => void;
  force2D?: boolean;
}

// WebGL Error Boundary so headless browsers or older GPUs smoothly render the 2D Tactical Blueprint
class WebGLErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('WebGL 3D Canvas fell back to 2D Tactical View:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

// Procedural 3D Facility Mesh
const FacilityMesh3D: React.FC<{
  facility: SessionFacility;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ facility, isSelected, onSelect }) => {
  const dishRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (dishRef.current && facility.facility_id === 'communication_station' && facility.is_operational) {
      dishRef.current.rotation.y += delta * 0.45;
    }
  });

  const scaleY = 1 + (facility.level - 1) * 0.22;
  const statusColor = !facility.is_operational
    ? '#64748b'
    : facility.condition < 45
    ? '#ef4444'
    : isSelected
    ? '#22d3ee'
    : hovered
    ? '#38bdf8'
    : '#94a3b8';

  return (
    <group
      position={[facility.grid_x, 0, facility.grid_z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Foundation Pad */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[1.85, 2.05, 0.16, 8]} />
        <meshStandardMaterial color={isSelected ? '#0891b2' : '#1e293b'} metalness={0.5} roughness={0.6} />
      </mesh>

      {/* Selection Ring */}
      {(isSelected || hovered) && (
        <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.0, 2.25, 32]} />
          <meshBasicMaterial color={isSelected ? '#22d3ee' : '#a78bfa'} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Facility-Specific 3D Architecture */}
      <group scale={[1, scaleY, 1]}>
        {facility.facility_id === 'crew_habitat' && (
          <group>
            <mesh position={[0, 1.0, 0]} castShadow>
              <sphereGeometry args={[1.45, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.35} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.55, 1.35]} castShadow>
              <boxGeometry args={[0.7, 0.8, 0.7]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.3} />
            </mesh>
          </group>
        )}

        {facility.facility_id === 'solar_array' && (
          <group>
            <mesh position={[0, 0.9, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.18, 1.8, 12]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, 1.75, 0]} rotation={[0.35, 0, 0]} castShadow>
              <boxGeometry args={[2.8, 0.08, 1.6]} />
              <meshStandardMaterial
                color="#1d4ed8"
                emissive="#1e3a8a"
                emissiveIntensity={facility.is_operational ? 0.45 : 0.05}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          </group>
        )}

        {facility.facility_id === 'battery_storage' && (
          <group>
            {[-0.65, 0, 0.65].map((xPos, i) => (
              <mesh key={i} position={[xPos, 0.85, 0]} castShadow>
                <cylinderGeometry args={[0.32, 0.32, 1.4, 16]} />
                <meshStandardMaterial
                  color="#eab308"
                  emissive="#ca8a04"
                  emissiveIntensity={facility.is_operational ? 0.25 : 0}
                  metalness={0.5}
                />
              </mesh>
            ))}
          </group>
        )}

        {facility.facility_id === 'oxygen_generator' && (
          <group>
            <mesh position={[-0.45, 1.0, 0]} castShadow>
              <cylinderGeometry args={[0.45, 0.45, 1.7, 18]} />
              <meshStandardMaterial color="#06b6d4" metalness={0.5} roughness={0.3} />
            </mesh>
            <mesh position={[0.55, 0.75, 0]} castShadow>
              <sphereGeometry args={[0.55, 18, 18]} />
              <meshStandardMaterial color="#e0f2fe" metalness={0.4} roughness={0.3} />
            </mesh>
          </group>
        )}

        {facility.facility_id === 'water_recycler' && (
          <group>
            <mesh position={[-0.45, 0.95, -0.2]} castShadow>
              <cylinderGeometry args={[0.42, 0.42, 1.6, 16]} />
              <meshStandardMaterial color="#0284c7" metalness={0.5} roughness={0.25} />
            </mesh>
            <mesh position={[0.45, 0.95, 0.2]} castShadow>
              <cylinderGeometry args={[0.42, 0.42, 1.6, 16]} />
              <meshStandardMaterial color="#38bdf8" metalness={0.5} roughness={0.25} />
            </mesh>
          </group>
        )}

        {facility.facility_id === 'greenhouse' && (
          <group>
            <mesh position={[0, 0.85, 0]} castShadow>
              <sphereGeometry args={[1.4, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial
                color="#4ade80"
                transparent
                opacity={0.55}
                emissive="#16a34a"
                emissiveIntensity={0.35}
              />
            </mesh>
            <mesh position={[0, 0.35, 0]}>
              <cylinderGeometry args={[1.1, 1.1, 0.35, 16]} />
              <meshStandardMaterial color="#15803d" />
            </mesh>
          </group>
        )}

        {facility.facility_id === 'radiation_shelter' && (
          <group>
            <mesh position={[0, 0.65, 0]} castShadow>
              <coneGeometry args={[1.55, 1.2, 6]} />
              <meshStandardMaterial color="#7c3aed" metalness={0.3} roughness={0.7} />
            </mesh>
          </group>
        )}

        {facility.facility_id === 'communication_station' && (
          <group>
            <mesh position={[0, 0.8, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.35, 1.5, 12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.6} />
            </mesh>
            <group ref={dishRef} position={[0, 1.65, 0]}>
              <mesh rotation={[0.5, 0, 0]}>
                <coneGeometry args={[0.95, 0.5, 20, 1, true]} />
                <meshStandardMaterial color="#f8fafc" side={THREE.DoubleSide} metalness={0.6} />
              </mesh>
            </group>
          </group>
        )}

        {![
          'crew_habitat',
          'solar_array',
          'battery_storage',
          'oxygen_generator',
          'water_recycler',
          'greenhouse',
          'radiation_shelter',
          'communication_station',
        ].includes(facility.facility_id) && (
          <group>
            <mesh position={[0, 0.85, 0]} castShadow>
              <boxGeometry args={[1.7, 1.3, 1.7]} />
              <meshStandardMaterial
                color={
                  facility.facility_id === 'medical_facility'
                    ? '#f43f5e'
                    : facility.facility_id === 'rover_garage'
                    ? '#f97316'
                    : facility.facility_id === 'research_laboratory'
                    ? '#a855f7'
                    : '#64748b'
                }
                metalness={0.45}
                roughness={0.4}
              />
            </mesh>
          </group>
        )}
      </group>

      {/* Floating Status Tag */}
      <Html position={[0, 2.55 * scaleY, 0]} center distanceFactor={22}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`cursor-pointer select-none px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap border shadow-md transition-transform ${
            isSelected
              ? 'bg-cyan-500 text-space-950 border-white font-bold scale-105'
              : 'bg-space-900/90 text-slate-100 border-cyan-500/40'
          }`}
          style={{ borderColor: statusColor }}
        >
          {facility.name} <span className="opacity-80">L{facility.level}</span> ({Math.round(facility.condition)}%)
        </div>
      </Html>
    </group>
  );
};

// Animated Surface Rover & Astronauts
const RoverAndAstronauts3D: React.FC<{ planet: 'moon' | 'mars' }> = ({ planet }) => {
  const roverRef = useRef<THREE.Group>(null);
  const astroRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (roverRef.current) {
      const r = 11.5;
      roverRef.current.position.x = Math.cos(t * 0.18) * r;
      roverRef.current.position.z = Math.sin(t * 0.18) * r;
      roverRef.current.rotation.y = -t * 0.18 + Math.PI;
    }
    if (astroRef.current) {
      astroRef.current.position.x = 2.8 + Math.sin(t * 0.7) * 1.4;
      astroRef.current.position.z = 3.2 + Math.cos(t * 0.7) * 1.4;
    }
  });

  return (
    <group>
      {/* Pressurized Exploration Rover */}
      <group ref={roverRef} position={[11, 0.35, 0]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[1.5, 0.65, 1.0]} />
          <meshStandardMaterial color={planet === 'moon' ? '#f8fafc' : '#fb923c'} metalness={0.5} />
        </mesh>
        <mesh position={[0.45, 0.55, 0]}>
          <boxGeometry args={[0.45, 0.4, 0.85]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.4} />
        </mesh>
      </group>

      {/* Astronaut on EVA Patrol */}
      <group ref={astroRef} position={[3, 0, 3]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <capsuleGeometry args={[0.18, 0.45, 8, 12]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0.98, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.15} />
        </mesh>
      </group>
    </group>
  );
};

// Interactive Planetary Terrain & Placement Grid
const PlanetaryTerrain3D: React.FC<{
  planet: 'moon' | 'mars';
  placementMode: boolean;
  onPlaceAt: (x: number, z: number) => void;
}> = ({ planet, placementMode, onPlaceAt }) => {
  const craters = useMemo(
    () => [
      { x: -12, z: -10, r: 3.4 },
      { x: 13, z: -9, r: 4.2 },
      { x: -11, z: 11, r: 2.8 },
      { x: 12, z: 12, r: 3.6 },
    ],
    []
  );

  const terrainColor = planet === 'moon' ? '#475569' : '#9a3412';
  const rimColor = planet === 'moon' ? '#64748b' : '#c2410c';

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={(e) => {
          if (placementMode) {
            e.stopPropagation();
            const gx = Math.round(e.point.x * 2) / 2;
            const gz = Math.round(e.point.z * 2) / 2;
            onPlaceAt(Math.max(-14, Math.min(14, gx)), Math.max(-14, Math.min(14, gz)));
          }
        }}
      >
        <planeGeometry args={[80, 80, 32, 32]} />
        <meshStandardMaterial color={terrainColor} roughness={0.92} metalness={0.08} />
      </mesh>

      {/* Outpost Grid Helper */}
      <gridHelper
        args={[32, 16, placementMode ? '#22d3ee' : '#334155', placementMode ? '#0891b2' : '#1e293b']}
        position={[0, 0.02, 0]}
      />

      {/* Planetary Craters / Ridges */}
      {craters.map((c, idx) => (
        <mesh key={idx} position={[c.x, 0.05, c.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[c.r * 0.65, c.r, 24]} />
          <meshStandardMaterial color={rimColor} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

// 2D Tactical Blueprint View (Fallback & Toggleable Engineering View)
export const OutpostBlueprint2D: React.FC<OutpostSceneProps> = ({
  planet,
  facilities,
  environment,
  selectedFacilityId,
  onSelectFacility,
  placementFacilityType,
  onPlaceFacilityAt,
}) => {
  const gridSlots = [
    { x: -6, z: -4 },
    { x: 0, z: -4 },
    { x: 5, z: -3 },
    { x: 10, z: -4 },
    { x: -6, z: 2 },
    { x: 0, z: 0 },
    { x: 5, z: 3 },
    { x: 10, z: 2 },
    { x: -6, z: 7 },
    { x: 0, z: 7 },
    { x: 5, z: 7 },
    { x: 10, z: 7 },
  ];

  return (
    <div
      className={`relative w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-cyan-500/30 p-5 flex flex-col justify-between ${
        planet === 'moon'
          ? 'bg-gradient-to-br from-slate-900 via-space-900 to-slate-950'
          : 'bg-gradient-to-br from-amber-950/60 via-space-900 to-red-950/50'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/70 pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-cyan-400" />
          <span className="font-mono text-xs uppercase tracking-wider text-cyan-300">
            2D Tactical Outpost Blueprint — {planet === 'moon' ? 'Shackleton Rim Sector' : 'Jezero Delta Sector'}
          </span>
        </div>
        <div className="text-xs text-slate-300 font-mono">
          Weather: <span className="text-cyan-300">{environment.weather_condition}</span> | Solar:{' '}
          <span className="text-amber-300">{Math.round(environment.effective_solar_multiplier * 100)}%</span>
        </div>
      </div>

      {placementFacilityType && (
        <div className="my-2 px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-200 text-xs flex items-center justify-between">
          <span>
            Placement Mode Active: Click any empty sector pad below to construct{' '}
            <strong>{placementFacilityType.replace(/_/g, ' ').toUpperCase()}</strong>.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-auto py-4">
        {gridSlots.map((slot, idx) => {
          const installed = facilities[idx];
          const isSelected = installed && installed.id === selectedFacilityId;

          if (installed) {
            return (
              <button
                key={installed.id}
                type="button"
                onClick={() => onSelectFacility(installed.id)}
                className={`p-3 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'bg-cyan-500/25 border-cyan-400 shadow-lg shadow-cyan-500/20'
                    : 'bg-space-800/85 border-slate-700 hover:border-cyan-500/50'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono text-cyan-300 mb-1">
                  <span>LVL {installed.level}</span>
                  <span className={installed.condition < 50 ? 'text-rose-400' : 'text-emerald-400'}>
                    {Math.round(installed.condition)}%
                  </span>
                </div>
                <div className="font-semibold text-sm text-white truncate">{installed.name}</div>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-300">
                  {installed.is_operational ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Online (-{installed.energy_consumption} kWh)
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Standby
                    </>
                  )}
                </div>
              </button>
            );
          }

          return (
            <button
              key={`empty-${idx}`}
              type="button"
              onClick={() => {
                if (placementFacilityType) {
                  onPlaceFacilityAt(slot.x, slot.z);
                }
              }}
              className={`p-3 rounded-xl border border-dashed flex flex-col items-center justify-center min-h-[88px] transition-all ${
                placementFacilityType
                  ? 'border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 cursor-pointer'
                  : 'border-slate-700/70 bg-space-900/40 text-slate-500 cursor-default'
              }`}
            >
              <PlusCircle className="w-4 h-4 mb-1 opacity-75" />
              <span className="text-xs font-mono">
                {placementFacilityType ? 'Click to Deploy Here' : `Pad (${slot.x}, ${slot.z})`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
        <span>Active Modules: {facilities.length}</span>
        <span>Click any module to inspect, upgrade, or repair in the Engineering Sidebar.</span>
      </div>
    </div>
  );
};

export const OutpostScene3D: React.FC<OutpostSceneProps> = (props) => {
  const {
    planet,
    facilities,
    environment,
    selectedFacilityId,
    onSelectFacility,
    placementFacilityType,
    onPlaceFacilityAt,
    force2D,
  } = props;

  const canRenderWebGL = useMemo(() => !force2D && isWebGLSupported(), [force2D]);

  if (!canRenderWebGL) {
    return <OutpostBlueprint2D {...props} />;
  }

  const sunIntensity = environment.is_lunar_night
    ? 0.35
    : environment.is_dust_storm
    ? 0.55
    : planet === 'moon'
    ? 1.45
    : 1.15;

  const ambientColor = planet === 'moon' ? '#94a3b8' : '#fdba74';

  return (
    <WebGLErrorBoundary fallback={<OutpostBlueprint2D {...props} />}>
      <div className="relative w-full h-full min-h-[440px] rounded-xl overflow-hidden border border-cyan-500/25 bg-space-950">
        {/* Top Overlay HUD inside 3D Viewport */}
        <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="px-3 py-1.5 rounded-lg bg-space-900/85 border border-cyan-500/30 text-xs text-slate-200 backdrop-blur-md flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-white">
              {planet === 'moon' ? 'Lunar South Pole — Shackleton Rim' : 'Mars — Jezero Crater Delta'}
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-cyan-300">{environment.weather_condition}</span>
          </div>

          {placementFacilityType && (
            <div className="px-3 py-1.5 rounded-lg bg-cyan-500 text-space-950 font-semibold text-xs shadow-lg pointer-events-auto">
              Click anywhere on the 3D surface grid to place {placementFacilityType.replace(/_/g, ' ')}
            </div>
          )}
        </div>

        <Canvas shadows camera={{ position: [14, 12, 16], fov: 45 }}>
          <color attach="background" args={[planet === 'moon' ? '#040711' : '#1c0d08']} />
          <fog attach="fog" args={[planet === 'moon' ? '#040711' : '#2a120a', 22, 65]} />

          <ambientLight intensity={0.55} color={ambientColor} />
          <directionalLight
            position={[18, 24, 12]}
            intensity={sunIntensity}
            color={planet === 'moon' ? '#f8fafc' : '#fed7aa'}
            castShadow
          />

          <Stars radius={90} depth={40} count={2500} factor={3} saturation={0} fade speed={0.6} />

          {/* Distant Earth in the Lunar Sky */}
          {planet === 'moon' && (
            <mesh position={[-24, 18, -32]}>
              <sphereGeometry args={[3.2, 24, 24]} />
              <meshStandardMaterial color="#3b82f6" emissive="#1d4ed8" emissiveIntensity={0.35} />
            </mesh>
          )}

          <PlanetaryTerrain3D
            planet={planet}
            placementMode={!!placementFacilityType}
            onPlaceAt={onPlaceFacilityAt}
          />

          {facilities.map((fac) => (
            <FacilityMesh3D
              key={fac.id}
              facility={fac}
              isSelected={fac.id === selectedFacilityId}
              onSelect={() => onSelectFacility(fac.id)}
            />
          ))}

          <RoverAndAstronauts3D planet={planet} />

          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            maxPolarAngle={Math.PI / 2 - 0.05}
            minDistance={6}
            maxDistance={38}
          />
        </Canvas>

        {/* Bottom Controls Hint */}
        <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-center justify-between text-[11px] text-slate-300 pointer-events-none">
          <span className="px-2.5 py-1 rounded bg-space-900/80 border border-slate-700/70">
            Drag to Rotate • Scroll to Zoom • Click any 3D Facility to Inspect/Upgrade
          </span>
          <span className="px-2.5 py-1 rounded bg-space-900/80 border border-slate-700/70 font-mono">
            Temp: {environment.surface_temp_c}°C | Solar Flux: {Math.round(environment.effective_solar_multiplier * 100)}%
          </span>
        </div>
      </div>
    </WebGLErrorBoundary>
  );
};

