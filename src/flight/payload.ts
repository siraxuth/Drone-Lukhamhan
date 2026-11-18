export const PAYLOAD_CHANNELS = [1, 3, 4, 6] as const;
export type PayloadChannel = typeof PAYLOAD_CHANNELS[number];
export type PayloadSide = 'L' | 'R';
export type ChannelCounts = Record<PayloadChannel, number>;
export type GatePositions = Partial<Record<PayloadChannel, number>>;
export type Payload = { L: number; R: number; channels?: ChannelCounts; installed?: ChannelCounts };

export const SIDE_CHANNELS = { L: [1, 3], R: [4, 6] } as const;
export const DROP_PAIRS = [[1, 4], [3, 6]] as const;
export const DEFAULT_GATE = { closed: 0, open: 110 };
export const EMPTY_PAYLOAD: Payload = { L: 0, R: 0 };

export function isPayloadChannel(value: number): value is PayloadChannel {
  return PAYLOAD_CHANNELS.some(channel => channel === value);
}

export function countsFor(payload: Payload): ChannelCounts {
  if (payload.channels) return { ...payload.channels };
  return {
    1: Math.min(10, payload.L),
    3: Math.max(0, payload.L - 10),
    4: Math.min(10, payload.R),
    6: Math.max(0, payload.R - 10),
  };
}

export function payloadWithCounts(channels: ChannelCounts, installed: ChannelCounts): Payload {
  return {
    L: channels[1] + channels[3],
    R: channels[4] + channels[6],
    channels: { ...channels },
    installed,
  };
}

export function servoDegreeToPulse(degrees: number, min = 490, max = 2550) {
  return Math.trunc(min + Math.min(180, Math.max(0, degrees)) * (max - min) / 180);
}

export const SERVO_COMMANDS = [
  'servo_config', 'servo_write', 'servo_write_pair', 'servo_pulse', 'servo_rate',
  'release_servo_degree', 'release_servo_angle', 'release_dual_servo_degree',
] as const;
