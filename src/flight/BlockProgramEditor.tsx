'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type * as BlocklyTypes from 'blockly';
import type { BlockCommand, BlockProgram, BlockStatement } from './parser';
import { blockCommandLineMap } from './block-program';

type BlocklyApi = typeof import('blockly');
type FieldMap = Record<string, string | number>;
let blocksDefined = false;

const TOOLBOX = `<xml xmlns="https://developers.google.com/blockly/xml">
  <category name="FLIGHT" colour="#2878D0">
    <block type="flight_calibration"/><block type="flight_delay"/><block type="flight_take_off"/><block type="flight_auto_land"/><block type="flight_stop_motor"/>
    <block type="flight_set_height"/><block type="flight_move_forward"/><block type="flight_move_backward"/><block type="flight_move_left"/><block type="flight_move_right"/><block type="flight_move_forward_time"/><block type="flight_move_backward_time"/><block type="flight_move_left_time"/><block type="flight_move_right_time"/><block type="flight_set_yaw"/><block type="flight_poshold"/>
  </category>
  <category name="MISSION" colour="#D78320">
    <block type="flight_turn_by_hand"/><block type="flight_drop"/><block type="flight_pop"/><block type="flight_shoot"/><block type="flight_shot_b"/>
  </category>
</xml>`;

const COMMAND_BLOCKS: Array<{ type: string; command: BlockCommand; message: string; fields?: Array<{ name: string; value: number; min?: number; max?: number }> }> = [
  { type: 'flight_calibration', command: 'calibration', message: 'calibration()' },
  { type: 'flight_delay', command: 'delay', message: 'delay(%1 ms)', fields: [{ name: 'VALUE', value: 3000, min: 0, max: 60000 }] },
  { type: 'flight_take_off', command: 'take_off', message: 'take_off()' },
  { type: 'flight_auto_land', command: 'auto_land', message: 'auto_land()' },
  { type: 'flight_stop_motor', command: 'stop_motor', message: 'stop_motor()' },
  { type: 'flight_set_height', command: 'set_height', message: 'set_height(%1 cm)', fields: [{ name: 'VALUE', value: 100, min: 0, max: 500 }] },
  { type: 'flight_move_forward', command: 'move_forward', message: 'move_forward(%1 cm)', fields: [{ name: 'VALUE', value: 100, min: 1, max: 2000 }] },
  { type: 'flight_move_backward', command: 'move_backward', message: 'move_backward(%1 cm)', fields: [{ name: 'VALUE', value: 100, min: 1, max: 2000 }] },
  { type: 'flight_move_left', command: 'move_left', message: 'move_left(%1 cm)', fields: [{ name: 'VALUE', value: 100, min: 1, max: 2000 }] },
  { type: 'flight_move_right', command: 'move_right', message: 'move_right(%1 cm)', fields: [{ name: 'VALUE', value: 100, min: 1, max: 2000 }] },
  { type: 'flight_move_forward_time', command: 'move_forward_time', message: 'move_forward_time(%1 ms)', fields: [{ name: 'VALUE', value: 1500, min: 100, max: 30000 }] },
  { type: 'flight_move_backward_time', command: 'move_backward_time', message: 'move_backward_time(%1 ms)', fields: [{ name: 'VALUE', value: 1500, min: 100, max: 30000 }] },
  { type: 'flight_move_left_time', command: 'move_left_time', message: 'move_left_time(%1 ms)', fields: [{ name: 'VALUE', value: 1500, min: 100, max: 30000 }] },
  { type: 'flight_move_right_time', command: 'move_right_time', message: 'move_right_time(%1 ms)', fields: [{ name: 'VALUE', value: 1500, min: 100, max: 30000 }] },
  { type: 'flight_set_yaw', command: 'set_yaw', message: 'set_yaw(%1, %2°)' },
  { type: 'flight_poshold', command: 'poshold', message: 'poshold()' },
  { type: 'flight_turn_by_hand', command: 'turnByHand', message: 'turnByHand(%1°)', fields: [{ name: 'VALUE', value: 180, min: 1, max: 360 }] },
  { type: 'flight_drop', command: 'drop', message: 'drop()' },
  { type: 'flight_pop', command: 'pop', message: 'pop()' },
  { type: 'flight_shoot', command: 'shoot', message: 'shoot()' },
  { type: 'flight_shot_b', command: 'shot_b', message: 'shot_b()' },
];

function defineBlocks(Blockly: BlocklyApi) {
  if (blocksDefined) return;
  const definitions: Array<Record<string, unknown>> = [{
    type: 'flight_key_selector', message0: 'KEY %1',
    args0: [{ type: 'field_dropdown', name: 'KEY', options: Array.from({ length: 11 }, (_, i) => [`KEY ${i + 1}`, String(i + 1)]) }],
    previousStatement: null,
    nextStatement: null,
    colour: '#2878D0', tooltip: 'เลือกปุ่ม KEY ที่จะใช้เรียกชุดคำสั่งนี้', deletable: false, movable: false,
  }];
  for (const spec of COMMAND_BLOCKS) {
    if (spec.command === 'set_yaw') {
      definitions.push({
        type: spec.type, message0: spec.message,
        args0: [
          { type: 'field_dropdown', name: 'DIRECTION', options: [['Right', '1'], ['Left', '2']] },
          { type: 'field_number', name: 'ANGLE', value: 90, min: 1, max: 360, precision: 1 },
        ], previousStatement: null, nextStatement: null, colour: '#2878D0', tooltip: 'Rotate the drone in place.',
      });
      continue;
    }
    const args = spec.fields?.map((field) => ({ type: 'field_number', name: field.name, value: field.value, min: field.min, max: field.max, precision: 1 })) ?? [];
    definitions.push({
      type: spec.type, message0: spec.message, ...(args.length ? { args0: args } : {}),
      previousStatement: null, nextStatement: null, colour: '#2878D0',
    });
  }
  Blockly.common.defineBlocksWithJsonArray(definitions);
  blocksDefined = true;
}

function connectStatements(workspace: BlocklyTypes.WorkspaceSvg, parent: BlocklyTypes.Block, statements: BlockStatement[]) {
  let connection = parent.nextConnection;
  for (const statement of statements) {
    const type = COMMAND_BLOCKS.find((item) => item.command === statement.command)?.type ?? 'flight_calibration';
    const fields: FieldMap = statement.command === 'set_yaw'
      ? { DIRECTION: statement.args[0] === 2 ? 2 : 1, ANGLE: statement.args[1] ?? 90 }
      : statement.args.length ? { VALUE: statement.args[0] } : {};
    const block = workspace.newBlock(type);
    for (const [name, value] of Object.entries(fields)) block.setFieldValue(String(value), name);
    block.initSvg();
    block.render();
    if (connection && block.previousConnection) connection.connect(block.previousConnection);
    connection = block.nextConnection;
  }
}

function buildWorkspace(Blockly: BlocklyApi, workspace: BlocklyTypes.WorkspaceSvg, program: BlockProgram) {
  Blockly.Events.disable();
  try {
    workspace.clear();
    const root = workspace.newBlock('flight_key_selector');
    root.initSvg();
    root.render();
    root.setDeletable(false);
    root.setMovable(false);
    root.moveBy(24, 24);
    root.setFieldValue(String(program.selectedKey), 'KEY');
    connectStatements(workspace, root, program.scripts[program.selectedKey] ?? []);
  } finally {
    Blockly.Events.enable();
  }
  workspace.render();
}

function readStatements(first: BlocklyTypes.Block | null): BlockStatement[] {
  const out: BlockStatement[] = [];
  let block = first;
  while (block) {
    const spec = COMMAND_BLOCKS.find((item) => item.type === block?.type);
    if (spec) {
      const args = spec.command === 'set_yaw'
        ? [Number(block.getFieldValue('DIRECTION')), Number(block.getFieldValue('ANGLE'))]
        : spec.fields?.length ? [Number(block.getFieldValue('VALUE'))] : [];
      out.push({ kind: 'command', command: spec.command, args });
    }
    block = block.getNextBlock();
  }
  return out;
}

function readWorkspace(workspace: BlocklyTypes.WorkspaceSvg, previous: BlockProgram, key = previous.selectedKey): BlockProgram {
  const root = workspace.getTopBlocks(false).find((block) => block.type === 'flight_key_selector');
  if (!root) return previous;
  return { selectedKey: key, scripts: { ...previous.scripts, [key]: readStatements(root.getNextBlock()) } };
}

function createTheme(Blockly: BlocklyApi, host: HTMLElement) {
  const styles = getComputedStyle(host);
  const token = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  const base = Blockly.Themes.Zelos;
  return Blockly.Theme.defineTheme('drone-simulator', {
    base,
    name: 'drone-simulator',
    startHats: false,
    componentStyles: {
      workspaceBackgroundColour: token('--canvas', '#f4f5f6'),
      toolboxBackgroundColour: token('--surface-2', '#eef0f2'),
      toolboxForegroundColour: token('--foreground', '#202124'),
      flyoutBackgroundColour: token('--surface', '#fff'),
      flyoutForegroundColour: token('--foreground', '#202124'),
      scrollbarColour: token('--muted-foreground', '#777'),
      insertionMarkerColour: token('--brand-blue', '#2878d0'),
      insertionMarkerOpacity: 0.25,
      scrollbarOpacity: 0.45,
      cursorColour: token('--brand-blue', '#2878d0'),
    },
    fontStyle: { family: styles.fontFamily || 'sans-serif', weight: '600', size: 12 },
  });
}

export function BlockProgramEditor({ program, onChange, activeCommand = null }: { program: BlockProgram; onChange: (program: BlockProgram) => void; activeCommand?: { key: number; line: number } | null }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<BlocklyTypes.WorkspaceSvg | null>(null);
  const blocklyRef = useRef<BlocklyApi | null>(null);
  const onChangeRef = useRef(onChange);
  const programRef = useRef(program);
  const activeKeyRef = useRef(program.selectedKey);
  const audioRef = useRef<AudioContext | null>(null);
  const lastConnectSoundRef = useRef(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    let disposed = false;
    let workspace: BlocklyTypes.WorkspaceSvg | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let themeObserver: MutationObserver | null = null;
    let BlocklyRef: BlocklyApi | null = null;
    const initialize = async () => {
      try {
        const Blockly = await import('blockly');
        if (disposed || !hostRef.current) return;
        defineBlocks(Blockly);
        workspace = Blockly.inject(hostRef.current, {
          toolbox: TOOLBOX,
          renderer: 'zelos',
          theme: createTheme(Blockly, hostRef.current),
          grid: { spacing: 24, length: 3, colour: getComputedStyle(hostRef.current).getPropertyValue('--line').trim() || '#d7dce0', snap: true },
          zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 1.4, minScale: 0.45, scaleSpeed: 1.1 },
          move: { scrollbars: true, drag: true, wheel: true },
          trashcan: true,
          sounds: false,
        });
        BlocklyRef = Blockly;
        blocklyRef.current = Blockly;
        workspaceRef.current = workspace;
        programRef.current = program;
        activeKeyRef.current = program.selectedKey;
        buildWorkspace(Blockly, workspace, program);
        const flyout = workspace.getToolbox()?.getFlyout();
        if (flyout) flyout.autoClose = false;
        workspace.addChangeListener((event) => {
          if (event.isUiEvent || event.type === Blockly.Events.FINISHED_LOADING) return;
          const root = workspace?.getTopBlocks(false).find((block) => block.type === 'flight_key_selector');
          if (!root || !workspace) return;
          if (event.type === Blockly.Events.BLOCK_CHANGE && 'element' in event && event.element === 'field' && 'name' in event && event.name === 'KEY') {
            const oldKey = activeKeyRef.current;
            const saved = readWorkspace(workspace, programRef.current, oldKey);
            const nextKey = Number(root.getFieldValue('KEY')) || 1;
            const next: BlockProgram = { selectedKey: nextKey, scripts: saved.scripts };
            programRef.current = next;
            activeKeyRef.current = nextKey;
            buildWorkspace(Blockly, workspace, next);
            onChangeRef.current(next);
            return;
          }
          const next = readWorkspace(workspace, programRef.current, activeKeyRef.current);
          programRef.current = next;
          onChangeRef.current(next);
          if (event.type === Blockly.Events.BLOCK_MOVE && 'newParentId' in event && event.newParentId && 'reason' in event && Array.isArray(event.reason) && event.reason.includes('connect')) {
            const blockId = 'blockId' in event && typeof event.blockId === 'string' ? event.blockId : null;
            const moved = blockId ? workspace.getBlockById(blockId) : null;
            let ancestor = moved;
            while (ancestor && ancestor.type !== 'flight_key_selector') ancestor = ancestor.getParent();
            const now = performance.now();
            if (ancestor && now - lastConnectSoundRef.current > 90) {
              lastConnectSoundRef.current = now;
              playConnectSound(audioRef);
            }
          }
        });
        setStatus('ready');
        resizeObserver = new ResizeObserver(() => { if (workspace && BlocklyRef) BlocklyRef.svgResize(workspace); });
        resizeObserver.observe(hostRef.current);
        themeObserver = new MutationObserver(() => {
          if (hostRef.current && workspace) workspace.setTheme(createTheme(Blockly, hostRef.current));
        });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
      } catch {
        if (!disposed) setStatus('error');
      }
    };
    void initialize();
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      workspace?.dispose();
      if (audioRef.current) void audioRef.current.close();
      workspaceRef.current = null;
      blocklyRef.current = null;
    };
  // Workspace is initialized once per mission/editor mount; its refs hold live edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const workspace = workspaceRef.current;
    const Blockly = blocklyRef.current;
    if (!workspace || !Blockly) return;
    const displayedKey = activeCommand?.key ?? program.selectedKey;
    const currentRoot = workspace.getTopBlocks(false).find((block) => block.type === 'flight_key_selector');
    if (currentRoot && Number(currentRoot.getFieldValue('KEY')) !== displayedKey) {
      activeKeyRef.current = displayedKey;
      buildWorkspace(Blockly, workspace, { ...program, selectedKey: displayedKey });
    }
    const blocks = workspace.getTopBlocks(false);
    for (const block of workspace.getAllBlocks(false)) block.getSvgRoot()?.classList.remove('sim-block-active');
    if (!activeCommand) return;
    const root = blocks.find((block) => block.type === 'flight_key_selector' && Number(block.getFieldValue('KEY')) === activeCommand.key);
    if (!root) return;
    const commandIndex = blockCommandLineMap(program, activeCommand.key).indexOf(activeCommand.line);
    if (commandIndex < 0) return;
    let block = root.getNextBlock();
    for (let index = 0; block && index < commandIndex; index++) block = block.getNextBlock();
    block?.getSvgRoot()?.classList.add('sim-block-active');
  }, [activeCommand, program]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.altKey || event.metaKey) return;
      const workspace = workspaceRef.current;
      if (!workspace) return;
      if (event.key === '-' || event.code === 'Minus') {
        event.preventDefault();
        workspace.zoomCenter(-1);
      } else if (event.key === '+' || event.key === '=' || event.code === 'Equal') {
        event.preventDefault();
        workspace.zoomCenter(1);
      } else if (event.key === '0' || event.code === 'Digit0') {
        event.preventDefault();
        workspace.zoomToFit();
      }
    };
    host.addEventListener('keydown', onKeyDown);
    return () => host.removeEventListener('keydown', onKeyDown);
  }, []);

  return <div className="grid h-full min-h-[26rem] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
      <span aria-hidden="true" className={`size-2 rounded-full ${status === 'error' ? 'bg-destructive' : 'bg-brand-blue'}`} />
      {status === 'loading' ? 'กำลังเตรียมพื้นที่บล็อก…' : status === 'error' ? 'โหลดพื้นที่บล็อกไม่สำเร็จ ลองเปลี่ยนกลับไปโหมด C++ แล้วเปิดใหม่' : 'เลือก KEY จากบล็อกแรก แล้วลากคำสั่งมาต่อกัน · เมนูค้างจนกว่าจะคลิกหมวดเดิม · Ctrl + − / + ซูมเฉพาะพื้นที่บล็อก'}
    </div>
    <div ref={hostRef} className="flight-blockly min-h-0 min-w-0 overflow-hidden bg-canvas" aria-label="พื้นที่เลือก KEY และต่อคำสั่งควบคุมโดรน" />
  </div>;
}

function playConnectSound(audioRef: MutableRefObject<AudioContext | null>) {
  try {
    const context = audioRef.current ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    const startAt = context.currentTime;
    const playTone = (frequency: number, delay: number, duration: number, volume: number, type: OscillatorType) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startAt + delay);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.28, startAt + delay + duration * 0.72);
      gain.gain.setValueAtTime(0.0001, startAt + delay);
      gain.gain.exponentialRampToValueAtTime(volume, startAt + delay + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + delay + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt + delay);
      oscillator.stop(startAt + delay + duration + 0.01);
    };
    // เสียงคลิกสั้นๆ ตอนบล็อกล็อกเข้าที่ (ดังพอได้ยินแต่ไม่แหลม)
    playTone(330, 0, 0.07, 0.16, 'square');
    playTone(660, 0.02, 0.12, 0.12, 'triangle');
    playTone(990, 0.05, 0.16, 0.07, 'sine');
  } catch {
    // Browser audio can be unavailable or blocked; block editing still works.
  }
}
