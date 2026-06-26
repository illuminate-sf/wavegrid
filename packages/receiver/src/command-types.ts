/**
 * Command mode protocol types.
 * 
 * In command mode, the server sends lightweight command messages
 * instead of full grid state every frame. The receiver runs
 * animations locally at 60fps.
 */

export interface SetAnimationCommand {
  type: 'command';
  action: 'setAnimation';
  name: string;
  speed?: number;
}

export interface SetSceneCommand {
  type: 'command';
  action: 'setScene';
  name: string;
}

export interface PaintCommand {
  type: 'command';
  action: 'paint';
  cells: Array<{ idx: number; h: number; s: number; b: number }>;
}

export interface SetBrightnessCommand {
  type: 'command';
  action: 'setBrightness';
  value: number;
}

export interface StopCommand {
  type: 'command';
  action: 'stop';
}

export interface SetShiftCommand {
  type: 'command';
  action: 'setShift';
  vx: number;
  vy: number;
}

export interface SetSmoothnessCommand {
  type: 'command';
  action: 'setSmoothness';
  value: number;
}

export interface SetAttackCommand {
  type: 'command';
  action: 'setAttack';
  value: number;
}

export interface SetSpeedCommand {
  type: 'command';
  action: 'setSpeed';
  value: number;
}

export type CommandMessage =
  | SetAnimationCommand
  | SetSceneCommand
  | PaintCommand
  | SetBrightnessCommand
  | StopCommand
  | SetShiftCommand
  | SetSmoothnessCommand
  | SetAttackCommand
  | SetSpeedCommand;

/**
 * Local animation state tracked by the receiver in command mode.
 */
export interface AnimationState {
  currentAnimation: string | null;
  speed: number;
  currentScene: string | null;
  brightness: number;
  attack: number;
  shiftVx: number;
  shiftVy: number;
  shiftAccX: number;
  shiftAccY: number;
  tick: number;
}

export function createDefaultAnimationState(): AnimationState {
  return {
    currentAnimation: null,
    speed: 1.0,
    currentScene: null,
    brightness: 100,
    attack: 1.0,
    shiftVx: 0,
    shiftVy: 0,
    shiftAccX: 0,
    shiftAccY: 0,
    tick: 0
  };
}
