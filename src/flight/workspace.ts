import type { BlockProgram } from './parser';
import type { Style } from './style';
import { BLOCK_COMMANDS } from './block-program';

export type SimulatorWorkspaceData = {
  slug: string;
  drafts: Record<string, string>;
  style: Style;
  editorMode: 'cpp' | 'blocks';
  blockPrograms: Record<string, BlockProgram>;
};

export const WORKSPACE_STORAGE_KEY = 'sim-workspace-v1';

export function readWorkspace(value: unknown): SimulatorWorkspaceData | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<SimulatorWorkspaceData>;
  if (typeof data.slug !== 'string' || data.slug.length > 100 || !data.drafts || typeof data.drafts !== 'object'
    || !['full', 'any', 'drone', 'parduino'].includes(data.style ?? '')
    || (data.editorMode !== 'cpp' && data.editorMode !== 'blocks')) return null;
  const drafts = Object.fromEntries(Object.entries(data.drafts).slice(0, 100).filter(([key, code]) => key.length <= 100 && typeof code === 'string' && code.length <= 100_000));
  const blockPrograms: Record<string, BlockProgram> = {};
  if (data.blockPrograms && typeof data.blockPrograms === 'object') for (const [slug, raw] of Object.entries(data.blockPrograms).slice(0, 100)) {
    if (slug.length > 100 || !raw || typeof raw !== 'object') continue;
    const candidate = raw as Partial<BlockProgram>;
    if (!Number.isInteger(candidate.selectedKey) || (candidate.selectedKey ?? 0) < 1 || (candidate.selectedKey ?? 0) > 11 || !candidate.scripts || typeof candidate.scripts !== 'object') continue;
    const scripts: BlockProgram['scripts'] = {};
    for (const [key, statements] of Object.entries(candidate.scripts)) {
      const n = Number(key);
      if (!Number.isInteger(n) || n < 1 || n > 11 || !Array.isArray(statements) || statements.length > 400) continue;
      scripts[n] = statements.filter(statement => statement && statement.kind === 'command' && statement.command in BLOCK_COMMANDS && Array.isArray(statement.args) && statement.args.length <= 2 && statement.args.every((arg: unknown) => typeof arg === 'number' && Number.isFinite(arg) && Math.abs(arg) <= 100_000));
    }
    blockPrograms[slug] = { selectedKey: candidate.selectedKey!, scripts };
  }
  return { slug: data.slug, drafts, style: data.style as Style, editorMode: data.editorMode, blockPrograms };
}
