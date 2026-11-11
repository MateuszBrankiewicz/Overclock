export interface DeathPose {
  phase:
    | 'anticipation'
    | 'impact_lock'
    | 'spasm'
    | 'table_slam'
    | 'table_rest'
    | 'floor_tumble'
    | 'floor_settled';
  bodyPosition: [number, number, number];
  bodyRotation: [number, number, number];
  chairPosition: [number, number, number];
  chairRotation: [number, number, number];
  headRotationX: number;
  isShockActive: boolean;
  isVisorDead: boolean;
}

export interface ShockPose {
  phase: 'anticipation' | 'impact_lock' | 'spasm' | 'settling' | 'settled';
  bodyPosition: [number, number, number];
  bodyRotation: [number, number, number];
  headRotationX: number;
  isShockActive: boolean;
}

/**
 * Computes deterministic multi-phase physics death pose for an eliminated Cyber-Rig operator.
 * 0.0 - 0.35s: Anticipation / cylinder locks aim.
 * 0.35 - 0.55s: Lightning strike impact -> involuntary tetanic muscle spasm arches body backward.
 * 0.55 - 1.10s: High-voltage seizure spasm with decaying amplitude.
 * 1.10 - 1.50s: Lurch forward onto table desk with gravity acceleration (t²).
 * 1.50 - 2.10s: Impact on table surface (squash + small bounce), resting motionless.
 * 2.10 - 2.90s: Slide and tumble sideways off table down to bunker floor.
 * 2.90s+: Motionless dead on floor with shattered visor.
 */
export function computeDeathPose(elapsed: number, seed: number = 0): DeathPose {
  const sideDir = Math.abs(seed) % 2 === 0 ? 1 : -1;

  if (elapsed < 0.35) {
    const t = Math.max(0, elapsed) / 0.35;
    return {
      phase: 'anticipation',
      bodyPosition: [0, 0, 0],
      bodyRotation: [-0.08 * t, 0, 0],
      chairPosition: [0, 0, -0.32],
      chairRotation: [0, 0, 0],
      headRotationX: -0.05 * t,
      isShockActive: false,
      isVisorDead: false,
    };
  }

  if (elapsed < 0.55) {
    const t = (elapsed - 0.35) / 0.2;
    const arch = Math.sin(t * (Math.PI / 2));
    return {
      phase: 'impact_lock',
      bodyPosition: [0, 0.04 * arch, -0.14 * arch],
      bodyRotation: [-0.42 * arch, 0, 0],
      chairPosition: [0, 0, -0.32],
      chairRotation: [0, 0, 0],
      headRotationX: -0.32 * arch,
      isShockActive: true,
      isVisorDead: false,
    };
  }

  if (elapsed < 1.1) {
    const t = (elapsed - 0.55) / 0.55;
    const decay = 1 - t;
    const rampIn = Math.min(1, t * 8);
    const wave = Math.sin((elapsed - 0.55) * 60 + seed) * rampIn;
    const cosWave = Math.cos((elapsed - 0.55) * 48 + seed) * rampIn;

    return {
      phase: 'spasm',
      bodyPosition: [wave * 0.07 * decay, 0.04 * decay + cosWave * 0.05 * decay, -0.14 * decay],
      bodyRotation: [-0.42 * decay + wave * 0.12 * decay, 0, cosWave * 0.08 * decay],
      chairPosition: [0, 0, -0.32],
      chairRotation: [0, 0, 0],
      headRotationX: -0.32 * decay + wave * 0.15 * decay,
      isShockActive: true,
      isVisorDead: false,
    };
  }

  if (elapsed < 1.5) {
    const t = (elapsed - 1.1) / 0.4;
    const ease = Math.pow(t, 2.2);

    return {
      phase: 'table_slam',
      bodyPosition: [0, -ease * 0.28, ease * 1.15],
      bodyRotation: [ease * 1.48, 0, ease * 0.12],
      chairPosition: [0, 0, -0.32 - ease * 0.25],
      chairRotation: [-ease * 0.22, 0, 0],
      headRotationX: ease * 0.85,
      isShockActive: false,
      isVisorDead: true,
    };
  }

  if (elapsed < 2.1) {
    const t = (elapsed - 1.5) / 0.6;
    const bounceT = Math.min(1, (elapsed - 1.5) / 0.16);
    const bounce = Math.sin(bounceT * Math.PI) * 0.04 * (1 - bounceT);

    return {
      phase: 'table_rest',
      bodyPosition: [0, -0.28 + bounce, 1.15 + t * 0.07],
      bodyRotation: [1.48, 0, 0.12],
      chairPosition: [0, 0, -0.57],
      chairRotation: [-0.22, 0, 0],
      headRotationX: 0.85,
      isShockActive: false,
      isVisorDead: true,
    };
  }

  if (elapsed < 2.9) {
    const t = (elapsed - 2.1) / 0.8;
    const easeDrop = Math.pow(t, 1.8);

    return {
      phase: 'floor_tumble',
      bodyPosition: [
        sideDir * easeDrop * 0.52,
        -0.28 - easeDrop * 0.56,
        1.22 - easeDrop * 0.34,
      ],
      bodyRotation: [
        1.48 - easeDrop * 0.35,
        0,
        0.12 + sideDir * easeDrop * 1.18,
      ],
      chairPosition: [0, 0, -0.57 - easeDrop * 0.18],
      chairRotation: [-0.22 - easeDrop * 0.16, 0, 0],
      headRotationX: 0.85 * (1 - easeDrop * 0.5),
      isShockActive: false,
      isVisorDead: true,
    };
  }

  return {
    phase: 'floor_settled',
    bodyPosition: [sideDir * 0.52, -0.84, 0.88],
    bodyRotation: [1.13, 0, 0.12 + sideDir * 1.18],
    chairPosition: [0, 0, -0.75],
    chairRotation: [-0.38, 0, 0],
    headRotationX: 0.42,
    isShockActive: false,
    isVisorDead: true,
  };
}

/**
 * Computes deterministic shock and recovery animation for an operator who survives voltage testing.
 */
export function computeShockPose(elapsed: number, seed: number = 0): ShockPose {
  if (elapsed < 0.35) {
    return {
      phase: 'anticipation',
      bodyPosition: [0, 0, 0],
      bodyRotation: [-0.08 * (elapsed / 0.35), 0, 0],
      headRotationX: 0,
      isShockActive: false,
    };
  }

  if (elapsed < 0.55) {
    const t = (elapsed - 0.35) / 0.2;
    const arch = Math.sin(t * (Math.PI / 2));
    return {
      phase: 'impact_lock',
      bodyPosition: [0, 0.03 * arch, -0.12 * arch],
      bodyRotation: [-0.38 * arch, 0, 0],
      headRotationX: -0.28 * arch,
      isShockActive: true,
    };
  }

  if (elapsed < 1.1) {
    const t = (elapsed - 0.55) / 0.55;
    const decay = 1 - t;
    const rampIn = Math.min(1, t * 8);
    const wave = Math.sin((elapsed - 0.55) * 60 + seed) * rampIn;
    const cosWave = Math.cos((elapsed - 0.55) * 48 + seed) * rampIn;

    return {
      phase: 'spasm',
      bodyPosition: [wave * 0.06 * decay, 0.03 * decay + cosWave * 0.04 * decay, -0.12 * decay],
      bodyRotation: [-0.38 * decay + wave * 0.1 * decay, 0, cosWave * 0.06 * decay],
      headRotationX: -0.28 * decay + wave * 0.12 * decay,
      isShockActive: true,
    };
  }

  return {
    phase: 'settled',
    bodyPosition: [0, 0, 0],
    bodyRotation: [0, 0, 0],
    headRotationX: 0,
    isShockActive: false,
  };
}
