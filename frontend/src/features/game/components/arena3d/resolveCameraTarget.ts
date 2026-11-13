import type { RoomState } from '../../schemas/gameEvents';
import type { ArenaCameraFocus } from '../../stores/types';

export interface CameraTargetParams {
  focus: ArenaCameraFocus;
  roomState: RoomState | null;
  subjectPosition: [number, number, number] | null;
  isLocalSubject: boolean;
  yawOffset: number;
  pitchOffset: number;
  mobilePullback: number;
  reducedMotion: boolean;
  shockShakeIntensity?: number;
  timeMs?: number;
}

export interface CameraTargetOutput {
  position: [number, number, number];
  lookAt: [number, number, number];
}

export function resolveCameraTarget({
  focus,
  roomState,
  subjectPosition,
  isLocalSubject,
  yawOffset,
  pitchOffset,
  mobilePullback,
  reducedMotion,
  shockShakeIntensity = 0,
  timeMs = 0,
}: CameraTargetParams): CameraTargetOutput {
  const pitchLook = pitchOffset * 0.4;
  let posX: number;
  let posY: number;
  let posZ: number;

  let lookX: number;
  let lookY: number;
  let lookZ: number;

  // 1. Base framing determined by CameraPreset focus or RoomState
  if (roomState === 'BluffCheck' || roomState === 'VoltageTest') {
    posX = 0;
    posY = 2.28;
    posZ = 2.45 + mobilePullback;
    lookX = 0;
    lookY = 0.95 + pitchLook;
    lookZ = 0;
  } else if (focus === 'table') {
    posX = 0;
    posY = 2.15;
    posZ = 2.65 + mobilePullback;
    lookX = 0;
    lookY = 0.9 + pitchLook;
    lookZ = 0.45;
  } else if (focus === 'opponents') {
    posX = 0;
    posY = 1.85;
    posZ = 2.9 + mobilePullback;
    lookX = 0;
    lookY = 1.22 + pitchLook;
    lookZ = -1.8;
  } else {
    // Overview / POV default
    posX = 0;
    posY = 1.94;
    posZ = 3.15 + mobilePullback;
    lookX = 0;
    lookY = 1.04 + pitchLook;
    lookZ = 0.2;
  }

  // 2. Action-Aware Tracking: Look towards active opponent / challenged operator
  if (subjectPosition && !isLocalSubject) {
    // 60/40 blend between table center and subject's upper chest / visor
    lookX = 0.6 * lookX + 0.4 * subjectPosition[0];
    lookY = 0.6 * lookY + 0.4 * (subjectPosition[1] + 0.35);
    lookZ = 0.6 * lookZ + 0.4 * subjectPosition[2];

    // Nudge camera position slightly toward the target seat
    const dirX = subjectPosition[0] > 0.2 ? 0.22 : subjectPosition[0] < -0.2 ? -0.22 : 0;
    posX += dirX;
    posZ = Math.max(1.8, posZ - 0.28);
  }

  // 3. User manual camera drag offset has priority
  const hasManualDrag = Math.abs(yawOffset) > 0.04 || Math.abs(pitchOffset) > 0.04;
  if (hasManualDrag) {
    posX += yawOffset * 0.75;
    lookX += yawOffset * 0.45;
  } else if (!reducedMotion && roomState === 'TurnActive' && subjectPosition && !isLocalSubject) {
    // Subtle automatic tilt towards active player's seat (max 0.12 yaw)
    const autoYaw = Math.max(-0.12, Math.min(0.12, subjectPosition[0] * 0.08));
    posX += autoYaw * 0.75;
    lookX += autoYaw * 0.45;
  }

  // 4. Opponent Shock Shake (brief ~120ms jolt on lightning strike)
  if (!reducedMotion && shockShakeIntensity > 0) {
    const clampedShake = Math.max(0, Math.min(1, shockShakeIntensity)) * 0.038;
    posX += Math.sin(timeMs * 0.065) * clampedShake;
    posY += Math.cos(timeMs * 0.075) * clampedShake;
  }

  return {
    position: [posX, posY, posZ],
    lookAt: [lookX, lookY, lookZ],
  };
}
