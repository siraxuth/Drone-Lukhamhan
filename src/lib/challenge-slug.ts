/** Local mission vocabulary: no external translation request or API key needed. */
const words: Record<string, string> = {
  'จุดตรวจ': 'checkpoint', 'จุดผ่าน': 'checkpoint', 'ความสูง': 'altitude', 'ลูกโป่ง': 'balloon',
  'ปล่อยบอล': 'ball-drop', 'ทิ้งบอล': 'ball-drop', 'ยิงเป้า': 'target-shooting', 'ลอดห่วง': 'hoop-flight',
  'ลงจอด': 'landing', 'ขึ้นบิน': 'takeoff', 'เริ่มต้น': 'beginner', 'ภารกิจ': 'mission',
  'สี่เหลี่ยม': 'square', 'สามเหลี่ยม': 'triangle', 'วงกลม': 'circle', 'โดรน': 'drone',
  'ทดสอบ': 'test', 'ฝึกบิน': 'flight-practice', 'สนาม': 'field', 'พื้นฐาน': 'basic',
  'ขั้นสูง': 'advanced', 'ง่าย': 'easy', 'กลาง': 'medium', 'ยาก': 'hard', 'โหด': 'extreme',
  'ซ้าย': 'left', 'ขวา': 'right', 'หน้า': 'front', 'หลัง': 'back', 'บอล': 'ball',
  'ห่วง': 'hoop', 'เป้า': 'target', 'แท่น': 'platform', 'แตะ': 'touch', 'กลุ่ม': 'group',
  'เดียว': 'single', 'หลาย': 'multi', 'และ': 'and', 'ระดับ': 'level', 'ด่าน': 'stage',
};
const letters: Record<string, string> = Object.fromEntries([
  ['ก','k'],['ขฃคฅฆ','kh'],['ง','ng'],['จ','ch'],['ฉชฌ','ch'],['ซศษส','s'],['ญย','y'],
  ['ฎด','d'],['ฏต','t'],['ฐฑฒถทธ','th'],['ณน','n'],['บ','b'],['ป','p'],['ผพภ','ph'],
  ['ฝฟ','f'],['ม','m'],['ร','r'],['ลฬ','l'],['ว','w'],['หฮ','h'],['อ','o'],['ะาั','a'],
  ['ิี','i'],['ึื','ue'],['ุู','u'],['เ','e'],['แ','ae'],['โ','o'],['ใไ','ai'],['ำ','am'],
].flatMap(([chars, latin]) => [...chars].map(char => [char, latin])));
export function challengeSlug(title: string): string {
  let value = title.normalize('NFKD').toLowerCase();
  for (const [thai, english] of Object.entries(words).sort((a,b) => b[0].length-a[0].length)) value=value.split(thai).join(`-${english}-`);
  value=[...value].map(c => letters[c] ?? ('๐๑๒๓๔๕๖๗๘๙'.includes(c) ? String('๐๑๒๓๔๕๖๗๘๙'.indexOf(c)) : c)).join('');
  return value.replace(/[\u0300-\u036f\u0e47-\u0e4e]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50).replace(/-$/,'') || 'mission';
}
