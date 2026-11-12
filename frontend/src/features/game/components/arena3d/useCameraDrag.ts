import type React from 'react';
import { useCallback, useMemo, useRef } from 'react';

export interface CameraOffsets {
  yaw: number;
  pitch: number;
}

const DEAD_ZONE_PX = 6;
const MAX_YAW = 0.9;
const MAX_PITCH = 0.45;
const IGNORED_TARGETS = 'button, input, [role="dialog"], [data-no-camera-drag]';

const clamp = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  dragging: boolean;
}

export interface CameraDrag {
  /** Mutable offsets read every frame by the camera controller (no React re-render). */
  offsetsRef: React.RefObject<CameraOffsets>;
  reset: (yaw?: number, pitch?: number) => void;
  handlers: {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  };
}

export function useCameraDrag(): CameraDrag {
  const offsetsRef = useRef<CameraOffsets>({ yaw: 0, pitch: 0 });
  const drag = useRef<DragState | null>(null);

  const reset = useCallback((yaw = 0, pitch = 0) => {
    offsetsRef.current.yaw = yaw;
    offsetsRef.current.pitch = pitch;
  }, []);

  const end = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== e.pointerId) return;
    if (state.dragging && e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    drag.current = null;
  }, []);

  const handlers = useMemo(
    () => ({
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        if (e.target instanceof Element && e.target.closest(IGNORED_TARGETS)) return;
        drag.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          lastX: e.clientX,
          lastY: e.clientY,
          dragging: false,
        };
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        const state = drag.current;
        if (!state || state.pointerId !== e.pointerId) return;
        if (!state.dragging) {
          if (Math.hypot(e.clientX - state.startX, e.clientY - state.startY) < DEAD_ZONE_PX) {
            return;
          }
          state.dragging = true;
          e.currentTarget.setPointerCapture?.(e.pointerId);
        }
        const offsets = offsetsRef.current;
        offsets.yaw = clamp(offsets.yaw + (e.clientX - state.lastX) / 220, MAX_YAW);
        offsets.pitch = clamp(offsets.pitch + (state.lastY - e.clientY) / 260, MAX_PITCH);
        state.lastX = e.clientX;
        state.lastY = e.clientY;
      },
      onPointerUp: end,
      onPointerCancel: end,
    }),
    [end]
  );

  return { offsetsRef, reset, handlers };
}
