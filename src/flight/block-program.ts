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
  const keys = [...new Set([...Object.keys(program.scripts).map(Number), program.selectedKey])].filter((key) => Number.isInteger(key) && key >= 1 && key <= 11).sort((a, b) => a - b);
  const handlers = keys.map((key) => `  drone.onKey${key}(runKey${key});`).join('\n');
  const functions = keys.map((key) => {
    const body = (program.scripts[key] ?? []).map((statement) => `  ${generateStatement(statement)}`).join('\n');
    return `void runKey${key}() {${body ? `\n${body}\n` : '\n'}}`;
  }).join('\n\n');
  return `void setup() {\n${handlers}\n}\n\nvoid loop() {\n}\n\n${functions}\n`;
}

/** 1-based generated C++ line for every command in the selected KEY stack. */
export function blockCommandLineMap(program: BlockProgram, key: number): number[] {
  const lines = generateBlockProgram(program).split('\n');
  const functionLine = lines.findIndex((line) => line.trim() === `void runKey${key}() {`);
  if (functionLine < 0) return [];
  return (program.scripts[key] ?? []).map((_, index) => functionLine + index + 2);
}

function generateStatement(statement: BlockStatement): string {
  const { name, args } = COMMAND_TEXT[statement.command];
  return `${name}(${statement.args.slice(0, args).join(', ')});`;
}
