import { useFrame, useThree } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import { Vector3 } from 'three';

import type { RoomState } from '../../schemas/gameEvents';
import type { ArenaCameraFocus } from '../../stores/types';
import type { CameraOffsets } from './useCameraDrag';

export const CameraController: React.FC<{
  focus: ArenaCameraFocus;
  roomState: RoomState | null;
  offsetsRef: React.RefObject<CameraOffsets>;
  isLocalEliminated: boolean;
  isLocalOverloaded: boolean;
  cinematicStartTimeMs: number | null;
}> = ({
  focus,
  roomState,
  offsetsRef,
  isLocalEliminated,
  isLocalOverloaded,
  cinematicStartTimeMs,
}) => {
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(1, size.height);
  // Pull camera slightly back on narrow/mobile screens so nothing clips horizontally
  const mobilePullback = aspect < 1 ? (1 - aspect) * 0.55 : 0;

  const targetPos = useMemo(() => new Vector3(), []);
  const targetLook = useMemo(() => new Vector3(), []);
  const currentLook = useRef(new Vector3(0, 1.0, 0.2));

  useFrame(({ camera }, delta) => {
    const localDeathElapsed =
      isLocalOverloaded && cinematicStartTimeMs
        ? Math.max(0, (Date.now() - cinematicStartTimeMs) / 1000)
        : null;

    // 1. Local Player Death Slam Sequence (First Person POV)
    if (localDeathElapsed !== null) {
      let rollZ = 0;
      let snapCamera = false;

      if (localDeathElapsed < 0.35) {
        // Anticipation: Cylinder locks onto our visor
        targetPos.set(0, 1.94, 3.15 + mobilePullback);
        targetLook.set(0, 1.25, 0);
      } else if (localDeathElapsed < 0.55) {
        // Lightning Impact Jolt: Body & head arch back
        const t = (localDeathElapsed - 0.35) / 0.2;
        targetPos.set(0, 1.94 + t * 0.12, 3.15 + t * 0.15 + mobilePullback);
        targetLook.set(0, 1.45, 0);
      } else if (localDeathElapsed < 1.1) {
        // High-voltage seizure spasm: violent jitter
        const decay = 1 - (localDeathElapsed - 0.55) / 0.55;
        const shakeX = Math.sin(localDeathElapsed * 75) * 0.05 * decay;
        const shakeY = Math.cos(localDeathElapsed * 60) * 0.04 * decay;
        targetPos.set(shakeX, 1.94 + shakeY, 3.15 + mobilePullback);
        targetLook.set(0, 1.25, 0);
        rollZ = Math.sin(localDeathElapsed * 50) * 0.04 * decay;
      } else if (localDeathElapsed < 1.5) {
        // FLY FORWARD AND SLAM FACE-FIRST ONTO THE TABLETOP DESK!
        const t = (localDeathElapsed - 1.1) / 0.4;
        const ease = Math.pow(t, 2.2);
        // Direct positioning gives crisp hard impact without lerp delay
        snapCamera = true;
        camera.position.set(0, 1.94 - ease * 0.98, 3.15 - ease * 1.05);
        currentLook.current.set(0, 0.78, 1.35);
        camera.lookAt(currentLook.current);
      } else if (localDeathElapsed < 2.1) {
        // Resting face-down on table desk with small damped bounce!
        snapCamera = true;
        const bounceT = Math.min(1, (localDeathElapsed - 1.5) / 0.16);
        const bounce = Math.sin(bounceT * Math.PI) * 0.03 * (1 - bounceT);
        camera.position.set(0, 0.96 + bounce, 2.1);
        currentLook.current.set(0, 0.78, 1.35);
        camera.lookAt(currentLook.current);
      } else if (localDeathElapsed < 2.9) {
        // Slide / roll sideways on table surface!
        snapCamera = true;
        const t = (localDeathElapsed - 2.1) / 0.8;
        const ease = Math.pow(t, 1.8);
        camera.position.set(ease * 0.35, 0.96 - ease * 0.08, 2.1);
        currentLook.current.set(0, 0.78, 1.35);
        camera.lookAt(currentLook.current);
        rollZ = ease * 1.15; // Sideways head roll on table
      } else {
        // Settled ghost / spectator camera elevated above table
        targetPos.set(0, 3.1, 2.65 + mobilePullback);
        targetLook.set(0, 0.85, 0);
      }

      if (!snapCamera) {
        const step = Math.min(1, delta * 7);
        camera.position.lerp(targetPos, step);
        currentLook.current.lerp(targetLook, step);
        camera.lookAt(currentLook.current);
      }

      // CRITICAL: Three.js lookAt recalculates rotation and resets roll to 0.
      // rotateZ MUST be called AFTER lookAt to preserve sideways head tilt!
      if (rollZ !== 0) {
        camera.rotateZ(rollZ);
      }
      return;
    }

    if (isLocalEliminated) {
      // If loaded already eliminated, remain in spectator view
      targetPos.set(0, 3.1, 2.65 + mobilePullback);
      targetLook.set(0, 0.85, 0);
      camera.rotation.z = 0;
      const step = Math.min(1, delta * 5);
      camera.position.lerp(targetPos, step);
      currentLook.current.lerp(targetLook, step);
      camera.lookAt(currentLook.current);
      return;
    }

    const { yaw: yawOffset, pitch: pitchOffset } = offsetsRef.current;
    const pitchLook = pitchOffset * 0.4;

    if (roomState === 'BluffCheck' || roomState === 'VoltageTest') {
      targetPos.set(yawOffset * 0.5, 2.35, 2.3 + mobilePullback);
      targetLook.set(0, 0.92 + pitchLook, 0);
    } else if (focus === 'table') {
      targetPos.set(yawOffset * 0.45, 2.15, 2.65 + mobilePullback);
      targetLook.set(yawOffset * 0.25, 0.9 + pitchLook, 0.45);
    } else if (focus === 'opponents') {
      targetPos.set(yawOffset * 1.1, 1.85, 2.9 + mobilePullback);
      targetLook.set(yawOffset * 0.8, 1.22 + pitchLook, -1.8);
    } else {
      targetPos.set(yawOffset * 0.75, 1.94, 3.15 + mobilePullback);
      targetLook.set(yawOffset * 0.45, 1.04 + pitchLook, 0.2);
    }

    const step = Math.min(1, delta * 5);
    camera.position.lerp(targetPos, step);
    currentLook.current.lerp(targetLook, step);
    camera.lookAt(currentLook.current);
  });

  return null;
};
