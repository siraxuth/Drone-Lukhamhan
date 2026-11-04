/** Turn the editable setup sketch into a KEY 1 callback program. */
export function bindStarterToKey(code: string, functionName = 'runMission') {
  if (/\bdrone\s*\.\s*onKey1\s*\(/.test(code)) return code;
  const match = /void\s+setup\s*\(\s*(?:void)?\s*\)\s*\{/.exec(code);
  if (!match) return code;
  const open = match.index + match[0].lastIndexOf('{');
  let depth = 1, close = open + 1;
  for (; close < code.length && depth; close++) {
    if (code[close] === '{') depth++;
    else if (code[close] === '}') depth--;
  }
  if (depth !== 0) return code;
  const body = code.slice(open + 1, close - 1).trim();
  const before = code.slice(0, match.index).trimEnd();
  const after = code.slice(close).trim();
  const loop = /\bvoid\s+loop\s*\(/.test(`${before}\n${after}`) ? '' : '\nvoid loop() {\n}\n';
  return `${before}${before ? '\n\n' : ''}void setup() {\n  drone.onKey1(${functionName});\n}\n${after ? `\n${after}\n` : '\n'}${loop}\nvoid ${functionName}() {\n${body}\n}\n`;
}

export const KEY_FUNCTION_EXAMPLE = `void setup() {
  drone.onKey1(flyForward);
  drone.onKey2(turnThenForward);
}

void loop() {
}

void flyForward() {
  calibration();
  delay(3000);
  take_off();
  delay(3000);
  set_height(100);
  move_forward(100);
  auto_land();
}

void turnThenForward() {
  calibration();
  delay(3000);
  take_off();
  delay(3000);
  set_height(100);
  set_yaw(1, 90);
  poshold();
  delay(1000);
  move_forward(100);
  auto_land();
}
`;
