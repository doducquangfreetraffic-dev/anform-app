// Vietnamese-aware slugifier.
const VN_MAP: Array<[RegExp, string]> = [
  [/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a'],
  [/[èéẹẻẽêềếệểễ]/g, 'e'],
  [/[ìíịỉĩ]/g, 'i'],
  [/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o'],
  [/[ùúụủũưừứựửữ]/g, 'u'],
  [/[ỳýỵỷỹ]/g, 'y'],
  [/đ/g, 'd'],
  [/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, 'A'],
  [/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, 'E'],
  [/[ÌÍỊỈĨ]/g, 'I'],
  [/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, 'O'],
  [/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, 'U'],
  [/[ỲÝỴỶỸ]/g, 'Y'],
  [/Đ/g, 'D'],
];

export function slugify(input: string, max = 50): string {
  let s = input.trim();
  for (const [re, ch] of VN_MAP) s = s.replace(re, ch);
  s = s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
  return s || `form-${Date.now().toString(36).slice(-6)}`;
}

export function makeTabName(slug: string): string {
  const ts = Date.now().toString().slice(-6);
  return `${slug}-${ts}`.slice(0, 100);
}
