'use client';

import { useEffect, useRef, useState } from 'react';
import type * as BlocklyTypes from 'blockly';
import type { BlockCommand, BlockProgram, BlockStatement } from './parser';

type BlocklyApi = typeof import('blockly');
type FieldMap = Record<string, string | number>;
let blocksDefined = false;

const TOOLBOX = `<xml xmlns="https://developers.google.com/blockly/xml">
  <category name="คำสั่งบิน" colour="#2878D0">
    <block type="flight_calibration"/><block type="flight_delay"/><block type="flight_take_off"/><block type="flight_auto_land"/><block type="flight_stop_motor"/>
    <block type="flight_set_height"/><block type="flight_move_forward"/><block type="flight_move_backward"/><block type="flight_move_left"/><block type="flight_move_right"/><block type="flight_set_yaw"/><block type="flight_poshold"/>
  </category>
  <category name="ภารกิจ" colour="#D78320">
    <block type="flight_turn_by_hand"/><block type="flight_drop"/><block type="flight_pop"/><block type="flight_shoot"/><block type="flight_shot_b"/>
  </category>
  <category name="ปุ่ม KEY" colour="#128C83"><block type="flight_key_binding"/></category>
  <category name="ฟังก์ชัน" colour="#7954B8"><block type="flight_function"/><block type="flight_function_call"/></category>
</xml>`;

const COMMAND_BLOCKS: Array<{ type: string; command: BlockCommand; message: string; fields?: Array<{ name: string; value: number; label: string; min?: number; max?: number }> }> = [
  { type: 'flight_calibration', command: 'calibration', message: 'ตั้งศูนย์ไจโร' },
  { type: 'flight_delay', command: 'delay', message: 'รอ %1 มิลลิวินาที', fields: [{ name: 'VALUE', value: 3000, label: 'มิลลิวินาที', min: 0, max: 60000 }] },
  { type: 'flight_take_off', command: 'take_off', message: 'ขึ้นบิน' },
  { type: 'flight_auto_land', command: 'auto_land', message: 'ลงจอดอัตโนมัติ' },
  { type: 'flight_stop_motor', command: 'stop_motor', message: 'หยุดมอเตอร์' },
  { type: 'flight_set_height', command: 'set_height', message: 'ตั้งความสูง %1 เซนติเมตร', fields: [{ name: 'VALUE', value: 100, label: 'เซนติเมตร', min: 0, max: 500 }] },
  { type: 'flight_move_forward', command: 'move_forward', message: 'บินไปข้างหน้า %1 เซนติเมตร', fields: [{ name: 'VALUE', value: 100, label: 'เซนติเมตร', min: 1, max: 2000 }] },
  { type: 'flight_move_backward', command: 'move_backward', message: 'บินถอยหลัง %1 เซนติเมตร', fields: [{ name: 'VALUE', value: 100, label: 'เซนติเมตร', min: 1, max: 2000 }] },
  { type: 'flight_move_left', command: 'move_left', message: 'เลื่อนไปทางซ้าย %1 เซนติเมตร', fields: [{ name: 'VALUE', value: 100, label: 'เซนติเมตร', min: 1, max: 2000 }] },
  { type: 'flight_move_right', command: 'move_right', message: 'เลื่อนไปทางขวา %1 เซนติเมตร', fields: [{ name: 'VALUE', value: 100, label: 'เซนติเมตร', min: 1, max: 2000 }] },
  { type: 'flight_set_yaw', command: 'set_yaw', message: 'หมุนหัวไปทาง %1 %2 องศา', fields: [{ name: 'ANGLE', value: 90, label: 'องศา', min: 1, max: 360 }] },
  { type: 'flight_poshold', command: 'poshold', message: 'ล็อกตำแหน่งให้นิ่ง' },
  { type: 'flight_turn_by_hand', command: 'turnByHand', message: 'หมุนโดรนด้วยมือ %1 องศา', fields: [{ name: 'VALUE', value: 180, label: 'องศา', min: 1, max: 360 }] },
  { type: 'flight_drop', command: 'drop', message: 'ปล่อยบอล' },
  { type: 'flight_pop', command: 'pop', message: 'แตะลูกโป่ง' },
  { type: 'flight_shoot', command: 'shoot', message: 'ยิงไปข้างหน้า' },
  { type: 'flight_shot_b', command: 'shot_b', message: 'ยิงไปด้านหลัง' },
];

function defineBlocks(Blockly: BlocklyApi) {
  if (blocksDefined) return;
  const definitions: Array<Record<string, unknown>> = [
    {
      type: 'flight_program', message0: 'โปรแกรมควบคุมโดรน',
      message1: 'เริ่มทำงานครั้งเดียว · setup() %1', args1: [{ type: 'input_statement', name: 'SETUP' }],
      message2: 'ทำซ้ำ · loop() %1', args2: [{ type: 'input_statement', name: 'LOOP' }],
      message3: 'ฟังก์ชันที่เรียกใช้ได้ %1', args3: [{ type: 'input_statement', name: 'FUNCTIONS', check: 'FUNCTION_DEF' }],
      colour: '#177F83', tooltip: 'วางคำสั่งใน setup หรือ loop และผูกปุ่ม KEY ให้เรียกฟังก์ชันด้านล่าง', deletable: false, movable: false,
    },
    {
      type: 'flight_key_binding', message0: 'เมื่อกด %1 ให้เรียก %2',
      args0: [
        { type: 'field_dropdown', name: 'KEY', options: Array.from({ length: 11 }, (_, i) => [`KEY ${i + 1}`, String(i + 1)]) },
        { type: 'field_input', name: 'FUNCTION', text: 'flyMission', spellcheck: false },
      ],
      previousStatement: null, nextStatement: null, colour: '#128C83', tooltip: 'วางบล็อกนี้ในช่อง setup แล้วสร้างฟังก์ชันชื่อเดียวกันด้านล่าง',
    },
    {
      type: 'flight_function', message0: 'ฟังก์ชัน %1', args0: [{ type: 'field_input', name: 'NAME', text: 'flyMission', spellcheck: false }],
      message1: 'ทำคำสั่งต่อไปนี้ %1', args1: [{ type: 'input_statement', name: 'BODY' }],
      previousStatement: 'FUNCTION_DEF', nextStatement: 'FUNCTION_DEF', colour: '#7954B8', tooltip: 'ฟังก์ชันจะเริ่มทำงานเมื่อถูกเรียกจาก KEY หรือฟังก์ชันอื่น',
    },
    {
      type: 'flight_function_call', message0: 'เรียกฟังก์ชัน %1', args0: [{ type: 'field_input', name: 'NAME', text: 'flyMission', spellcheck: false }],
      previousStatement: null, nextStatement: null, colour: '#7954B8', tooltip: 'เรียกฟังก์ชันที่สร้างไว้ด้านล่าง',
    },
  ];
  for (const spec of COMMAND_BLOCKS) {
    if (spec.command === 'set_yaw') {
      definitions.push({
        type: spec.type, message0: spec.message,
        args0: [
          { type: 'field_dropdown', name: 'DIRECTION', options: [['ขวา', '1'], ['ซ้าย', '2']] },
          { type: 'field_number', name: 'ANGLE', value: 90, min: 1, max: 360, precision: 1 },
        ], previousStatement: null, nextStatement: null, colour: '#2878D0', tooltip: 'หมุนหัวโดรนอยู่กับที่ ไม่ได้สั่งให้บินเลี้ยว',
      });
      continue;
    }
    const args = spec.fields?.map((field) => ({ type: 'field_number', name: field.name, value: field.value, min: field.min, max: field.max, precision: 1 })) ?? [];
    definitions.push({
      type: spec.type, message0: spec.message, ...(args.length ? { args0: args } : {}),
      previousStatement: null, nextStatement: null, colour: spec.command === 'delay' ? '#D78320' : '#2878D0',
    });
  }
  Blockly.common.defineBlocksWithJsonArray(definitions);
  blocksDefined = true;
}

function connectStatements(
  Blockly: BlocklyApi,
  workspace: BlocklyTypes.WorkspaceSvg,
  parent: BlocklyTypes.Block,
  input: string,
  statements: BlockStatement[],
) {
  let connection = parent.getInput(input)?.connection ?? null;
  for (const statement of statements) {
    let type: string;
    let fields: FieldMap;
    if (statement.kind === 'key') { type = 'flight_key_binding'; fields = { KEY: statement.key, FUNCTION: statement.functionName }; }
    else if (statement.kind === 'call') { type = 'flight_function_call'; fields = { NAME: statement.functionName }; }
    else {
      type = COMMAND_BLOCKS.find((item) => item.command === statement.command)?.type ?? 'flight_calibration';
      fields = statement.command === 'set_yaw'
        ? { DIRECTION: statement.args[0] === 2 ? 2 : 1, ANGLE: statement.args[1] ?? 90 }
        : statement.args.length ? { VALUE: statement.args[0] } : {};
    }
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
    const root = workspace.newBlock('flight_program');
    root.initSvg();
    root.render();
    root.setDeletable(false);
    root.setMovable(false);
    root.moveBy(24, 24);
    connectStatements(Blockly, workspace, root, 'SETUP', program.setup);
    connectStatements(Blockly, workspace, root, 'LOOP', program.loop);
    let connection = root.getInput('FUNCTIONS')?.connection ?? null;
    for (const fn of program.functions) {
      const block = workspace.newBlock('flight_function');
      block.setFieldValue(fn.name, 'NAME');
      block.initSvg();
      block.render();
      if (connection && block.previousConnection) connection.connect(block.previousConnection);
      connectStatements(Blockly, workspace, block, 'BODY', fn.body);
      connection = block.nextConnection;
    }
  } finally {
    Blockly.Events.enable();
  }
  workspace.render();
}

function readStatements(first: BlocklyTypes.Block | null): BlockStatement[] {
  const out: BlockStatement[] = [];
  let block = first;
  while (block) {
    if (block.type === 'flight_key_binding') {
      out.push({ kind: 'key', key: Number(block.getFieldValue('KEY')), functionName: block.getFieldValue('FUNCTION') || 'flyMission' });
    } else if (block.type === 'flight_function_call') {
      out.push({ kind: 'call', functionName: block.getFieldValue('NAME') || 'flyMission' });
    } else {
      const spec = COMMAND_BLOCKS.find((item) => item.type === block?.type);
      if (spec) {
        const args = spec.command === 'set_yaw'
          ? [Number(block.getFieldValue('DIRECTION')), Number(block.getFieldValue('ANGLE'))]
          : spec.fields?.length ? [Number(block.getFieldValue('VALUE'))] : [];
        out.push({ kind: 'command', command: spec.command, args });
      }
    }
    block = block.getNextBlock();
  }
  return out;
}

function readWorkspace(workspace: BlocklyTypes.WorkspaceSvg): BlockProgram {
  const root = workspace.getTopBlocks(false).find((block) => block.type === 'flight_program');
  if (!root) return { setup: [], loop: [], functions: [] };
  const functions: BlockProgram['functions'] = [];
  let block = root.getInputTargetBlock('FUNCTIONS');
  while (block) {
    if (block.type === 'flight_function') {
      functions.push({
        name: block.getFieldValue('NAME') || 'flyMission',
        body: readStatements(block.getInputTargetBlock('BODY')),
      });
    }
    block = block.getNextBlock();
  }
  return {
    setup: readStatements(root.getInputTargetBlock('SETUP')),
    loop: readStatements(root.getInputTargetBlock('LOOP')),
    functions,
  };
}

export function BlockProgramEditor({ program, onChange }: { program: BlockProgram; onChange: (program: BlockProgram) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<BlocklyTypes.WorkspaceSvg | null>(null);
  const onChangeRef = useRef(onChange);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    let disposed = false;
    let workspace: BlocklyTypes.WorkspaceSvg | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let BlocklyRef: BlocklyApi | null = null;
    const initialize = async () => {
      try {
        const Blockly = await import('blockly');
        if (disposed || !hostRef.current) return;
        defineBlocks(Blockly);
        workspace = Blockly.inject(hostRef.current, {
          toolbox: TOOLBOX,
          renderer: 'zelos',
          grid: { spacing: 24, length: 3, colour: 'var(--line)', snap: true },
          zoom: { controls: true, wheel: true, startScale: 0.85, maxScale: 1.4, minScale: 0.45, scaleSpeed: 1.1 },
          move: { scrollbars: true, drag: true, wheel: true },
          trashcan: true,
          sounds: false,
        });
        BlocklyRef = Blockly;
        workspaceRef.current = workspace;
        buildWorkspace(Blockly, workspace, program);
        workspace.addChangeListener((event) => {
          if (event.isUiEvent || event.type === Blockly.Events.FINISHED_LOADING) return;
          const root = workspace?.getTopBlocks(false).find((block) => block.type === 'flight_program');
          if (root) root.setDeletable(false);
          if (workspace) onChangeRef.current(readWorkspace(workspace));
        });
        setStatus('ready');
        resizeObserver = new ResizeObserver(() => { if (workspace && BlocklyRef) BlocklyRef.svgResize(workspace); });
        resizeObserver.observe(hostRef.current);
      } catch {
        if (!disposed) setStatus('error');
      }
    };
    void initialize();
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      workspace?.dispose();
      workspaceRef.current = null;
    };
  // The workspace is intentionally initialized once per mission/editor mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="grid h-full min-h-[26rem] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
    <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
      <span aria-hidden="true" className="size-2 rounded-full bg-brand-blue" />
      {status === 'loading' ? 'กำลังเตรียมพื้นที่บล็อก…' : status === 'error' ? 'โหลดพื้นที่บล็อกไม่สำเร็จ ลองเปลี่ยนกลับไปโหมด C++ แล้วเปิดใหม่' : 'ลากบล็อกจากหมวดด้านซ้ายมาต่อกัน · พื้นที่ setup, loop และฟังก์ชันอยู่บนบล็อกโปรแกรม'}
    </div>
    <div ref={hostRef} className="flight-blockly min-h-0 min-w-0 overflow-hidden bg-canvas" aria-label="พื้นที่เขียนโปรแกรมแบบบล็อก" />
  </div>;
}
