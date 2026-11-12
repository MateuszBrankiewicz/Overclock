export type LeaveConfirmState = 'idle' | 'confirming';
export type LeaveConfirmAction = 'request' | 'confirm' | 'cancel';

export interface LeaveConfirmResult {
  state: LeaveConfirmState;
  shouldLeave: boolean;
}

/** Two-step leave: the first click asks, only an explicit confirm leaves. */
export function reduceLeaveConfirm(
  state: LeaveConfirmState,
  action: LeaveConfirmAction
): LeaveConfirmResult {
  if (action === 'request') return { state: 'confirming', shouldLeave: false };
  if (action === 'confirm') return { state: 'idle', shouldLeave: state === 'confirming' };
  return { state: 'idle', shouldLeave: false };
}
