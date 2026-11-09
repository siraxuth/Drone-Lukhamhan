import type { BlockCommand, BlockProgram, BlockStatement } from './parser';

const COMMAND_TEXT: Record<BlockCommand, { name: string; args: number }> = {
  calibration: { name: 'calibration', args: 0 }, delay: { name: 'delay', args: 1 },
  take_off: { name: 'take_off', args: 0 }, auto_land: { name: 'auto_land', args: 0 }, stop_motor: { name: 'stop_motor', args: 0 },
  set_height: { name: 'set_height', args: 1 }, move_forward: { name: 'move_forward', args: 1 },
  move_backward: { name: 'move_backward', args: 1 }, move_left: { name: 'move_left', args: 1 }, move_right: { name: 'move_right', args: 1 },
  set_yaw: { name: 'set_yaw', args: 2 }, poshold: { name: 'poshold', args: 0 }, turnByHand: { name: 'turnByHand', args: 1 },
  drop: { name: 'drop', args: 0 }, pop: { name: 'pop', args: 0 }, shoot: { name: 'shoot', args: 0 }, shot_b: { name: 'shot_b', args: 0 },
};

export const BLOCK_COMMANDS = COMMAND_TEXT;

export function generateBlockProgram(program: BlockProgram): string {
  const indent = (body: BlockStatement[]) => body.map((statement) => `  ${generateStatement(statement)}`).join('\n');
  const bodyOf = (body: BlockStatement[]) => body.length ? `\n${indent(body)}\n` : '\n';
  const functions = program.functions.map((fn) => `void ${fn.name}() {${bodyOf(fn.body)}}`).join('\n\n');
  return `void setup() {${bodyOf(program.setup)}}\n\nvoid loop() {${bodyOf(program.loop)}}${functions ? `\n\n${functions}` : ''}\n`;
}

function generateStatement(statement: BlockStatement): string {
  if (statement.kind === 'key') return `drone.onKey${statement.key}(${statement.functionName});`;
  if (statement.kind === 'call') return `${statement.functionName}();`;
  const { name, args } = COMMAND_TEXT[statement.command];
  return `${name}(${statement.args.slice(0, args).join(', ')});`;
}
