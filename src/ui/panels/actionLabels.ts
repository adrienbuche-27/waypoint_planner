import type { Action } from '../../domain/types';

export const ACTION_LABELS: Record<Action['type'], string> = {
  hover: 'Hover',
  photo: 'Photo',
  startVideo: 'Start video',
  stopVideo: 'Stop video',
  gimbal: 'Gimbal',
  yaw: 'Yaw',
};

export function actionSummary(a: Action): string {
  switch (a.type) {
    case 'hover':
      return `Hover ${a.seconds}s`;
    case 'gimbal':
      return `Gimbal ${a.pitchDeg}°`;
    case 'yaw':
      return `Yaw ${a.headingDeg}°`;
    default:
      return ACTION_LABELS[a.type];
  }
}
