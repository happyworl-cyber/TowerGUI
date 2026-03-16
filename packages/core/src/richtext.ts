/**
 * UBB/BBCode parser → Unity TMP rich text tags.
 * Supports: [color], [size], [b], [i], [u], [s], [url], [img]
 */

export interface RichTextSegment {
  text: string;
  tags: string; // TMP opening tags
  closeTags: string; // TMP closing tags
}

const UBB_RULES: Array<{ pattern: RegExp; replace: string }> = [
  // [color=#hex]...[/color] → <color=#hex>...</color>
  { pattern: /\[color=(#[0-9a-fA-F]{6,8})\]([\s\S]*?)\[\/color\]/g, replace: '<color=$1>$2</color>' },
  // [size=N]...[/size] → <size=N>...</size>
  { pattern: /\[size=(\d+)\]([\s\S]*?)\[\/size\]/g, replace: '<size=$1>$2</size>' },
  // [b]...[/b] → <b>...</b>
  { pattern: /\[b\]([\s\S]*?)\[\/b\]/g, replace: '<b>$1</b>' },
  // [i]...[/i] → <i>...</i>
  { pattern: /\[i\]([\s\S]*?)\[\/i\]/g, replace: '<i>$1</i>' },
  // [u]...[/u] → <u>...</u>
  { pattern: /\[u\]([\s\S]*?)\[\/u\]/g, replace: '<u>$1</u>' },
  // [s]...[/s] → <s>...</s>
  { pattern: /\[s\]([\s\S]*?)\[\/s\]/g, replace: '<s>$1</s>' },
  // [url=link]text[/url] → <link="link"><color=#4488ff><u>text</u></color></link>
  { pattern: /\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/g, replace: '<link="$1"><color=#4488ff><u>$2</u></color></link>' },
  // [img]name[/img] → <sprite name="name">
  { pattern: /\[img\]([^\[]+)\[\/img\]/g, replace: '<sprite name="$1">' },
];

export function ubbToTMP(ubb: string): string {
  if (!ubb) return '';
  let result = ubb;
  for (const rule of UBB_RULES) {
    result = result.replace(rule.pattern, rule.replace);
  }
  return result;
}

export function htmlToTMP(html: string): string {
  if (!html) return '';
  let result = html;
  result = result.replace(/<span\s+style="color:\s*([^"]+)">/g, '<color=$1>');
  result = result.replace(/<\/span>/g, '</color>');
  result = result.replace(/<strong>/g, '<b>');
  result = result.replace(/<\/strong>/g, '</b>');
  result = result.replace(/<em>/g, '<i>');
  result = result.replace(/<\/em>/g, '</i>');
  result = result.replace(/<br\s*\/?>/g, '\n');
  return result;
}

export function stripTags(text: string): string {
  if (!text) return '';
  return text.replace(/<[^>]+>/g, '').replace(/\[[^\]]+\]/g, '');
}
