import { isBoardCode } from "@/src/api/ids";

export type TextStyleFlags = {
  quote: boolean;
  spoiler: boolean;
  bold: boolean;
  italic: boolean;
  mono: boolean;
  underline: boolean;
};

export type Segment =
  | { type: "text"; text: string; dead: boolean; style: TextStyleFlags }
  | { type: "link"; text: string; href: string; dead: boolean; style: TextStyleFlags }
  | { type: "break" };

export type QuoteTarget =
  | { kind: "post"; postId: number }
  | { kind: "thread"; board: string; threadId: number; postId?: number }
  | { kind: "board"; board: string }
  | { kind: "url"; url: string };

type Frame = TextStyleFlags & {
  href?: string;
  dead: boolean;
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
};

function codePoint(code: number): string | null {
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return null;
  if (code >= 0xd800 && code <= 0xdfff) return null;
  return String.fromCodePoint(code);
}

/** Décode les entités HTML après le découpage des balises, pour ne pas réinterpréter le HTML. */
export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (full, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      return codePoint(Number.parseInt(body.slice(2), 16)) ?? full;
    }
    if (body.startsWith("#")) {
      return codePoint(Number.parseInt(body.slice(1), 10)) ?? full;
    }
    return NAMED_ENTITIES[body] ?? full;
  });
}

export function htmlToPlain(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function readTag(raw: string): { name: string; closing: boolean; attrs: Record<string, string> } | null {
  const match = /^<\s*(\/)?\s*([a-zA-Z0-9]+)/.exec(raw);
  if (!match) return null;
  const attrs: Record<string, string> = {};
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let attr: RegExpExecArray | null;
  while ((attr = attrRe.exec(raw))) {
    attrs[attr[1].toLowerCase()] = decodeEntities(attr[2] ?? attr[3] ?? "");
  }
  return {
    name: match[2].toLowerCase(),
    closing: Boolean(match[1]),
    attrs,
  };
}

function snapshot(stack: Frame[]): TextStyleFlags & { href?: string; dead: boolean } {
  const style: TextStyleFlags & { href?: string; dead: boolean } = {
    quote: false,
    spoiler: false,
    bold: false,
    italic: false,
    mono: false,
    underline: false,
    dead: false,
  };
  for (const frame of stack) {
    if (frame.quote) style.quote = true;
    if (frame.spoiler) style.spoiler = true;
    if (frame.bold) style.bold = true;
    if (frame.italic) style.italic = true;
    if (frame.mono) style.mono = true;
    if (frame.underline) style.underline = true;
    if (frame.dead) style.dead = true;
    if (frame.href) style.href = frame.href;
  }
  return style;
}

function frameFrom(tag: { name: string; attrs: Record<string, string> }): Frame {
  const classes = new Set((tag.attrs.class ?? "").toLowerCase().split(/\s+/).filter(Boolean));
  return {
    quote: classes.has("quote"),
    spoiler: tag.name === "s" || tag.name === "del",
    bold: tag.name === "b" || tag.name === "strong",
    italic: tag.name === "i" || tag.name === "em",
    mono: tag.name === "pre" || tag.name === "code",
    underline: tag.name === "u",
    dead: classes.has("deadlink"),
    href: tag.name === "a" ? tag.attrs.href : undefined,
  };
}

function countChar(value: string, char: string): number {
  let count = 0;
  for (const item of value) if (item === char) count += 1;
  return count;
}

/** La ponctuation finale reste du texte. Une parenthèse fermante ne part que si elle est en trop. */
function trimUrl(raw: string): string {
  let url = raw;
  while (url.length > 0) {
    const last = url[url.length - 1];
    if (/[.,;:!?'"]/.test(last)) {
      url = url.slice(0, -1);
      continue;
    }
    if (last === ")" && countChar(url, ")") > countChar(url, "(")) {
      url = url.slice(0, -1);
      continue;
    }
    if (last === "]" && countChar(url, "]") > countChar(url, "[")) {
      url = url.slice(0, -1);
      continue;
    }
    break;
  }
  return url;
}

function isLinkable(url: string): boolean {
  if (url.length < 10 || /^(javascript|data|vbscript):/i.test(url)) return false;
  return /^(?:https?:\/\/|\/\/)[^\s/?#]+/i.test(url);
}

/** Les URL nues de 4chan ne sont pas toujours dans un <a>, et <wbr> les coupe. */
function autolink(text: string, dead: boolean, style: TextStyleFlags): Segment[] {
  const segments: Segment[] = [];
  const re = /(?:https?:\/\/|\/\/)[^\s<>"']+/gi;
  let last = 0;
  for (const match of text.matchAll(re)) {
    const raw = match[0];
    const index = match.index ?? 0;
    const url = trimUrl(raw);
    if (!isLinkable(url)) continue;
    if (index > last) segments.push({ type: "text", text: text.slice(last, index), dead, style });
    segments.push({
      type: "link",
      text: url,
      href: url.startsWith("//") ? `https:${url}` : url,
      dead,
      style,
    });
    last = index + url.length;
  }
  if (last < text.length) segments.push({ type: "text", text: text.slice(last), dead, style });
  return segments;
}

/**
 * HTML limité des commentaires : br, greentext, quotelinks, spoilers, emphase.
 * <wbr> ne coupe pas le texte : 4chan s'en sert au milieu des URL.
 * Pas de WebView : le texte reste du texte, les liens sont filtrés par classifyHref.
 */
export function parseComment(html: string): Segment[] {
  const segments: Segment[] = [];
  const stack: Frame[] = [];
  let buffer = "";

  const flush = () => {
    if (!buffer) return;
    const text = decodeEntities(buffer);
    buffer = "";
    if (!text) return;
    const current = snapshot(stack);
    if (current.href) {
      segments.push({
        type: "link",
        text,
        href: current.href,
        dead: current.dead,
        style: current,
      });
      return;
    }
    segments.push(...autolink(text, current.dead, current));
  };

  const tokens = html.match(/<[^>]+>|[^<]+/g) ?? [];
  for (const token of tokens) {
    if (!token.startsWith("<")) {
      const parts = token.split("\n");
      parts.forEach((part, index) => {
        if (index > 0) {
          flush();
          segments.push({ type: "break" });
        }
        if (part) buffer += part;
      });
      continue;
    }

    const tag = readTag(token);
    if (!tag || tag.name === "wbr") continue;
    flush();
    if (tag.name === "br") {
      segments.push({ type: "break" });
      continue;
    }
    if (tag.closing) {
      if (stack.length > 0) stack.pop();
      continue;
    }
    stack.push(frameFrom(tag));
  }

  flush();
  return segments;
}

function parseId(value: string | undefined): number | null {
  if (!value || !/^[1-9]\d{0,15}$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

const THREAD_HREF =
  /^(?:(?:https?:)?\/\/boards\.4chan(?:nel)?\.org)?\/([a-z0-9]{1,8})\/thread\/(\d+)(?:\/[^#?\s]*)?(?:#p(\d+))?\/?$/i;
const BOARD_HREF =
  /^(?:(?:https?:)?\/\/boards\.4chan(?:nel)?\.org)?\/([a-z0-9]{1,8})(?:\/(?:catalog)?)?(?:[#?].*)?\/?$/i;

/** javascript: et data: sont ignorés. Un board 4chan s'ouvre dans l'app, le reste du http(s) dans le navigateur. */
export function classifyHref(href: string): QuoteTarget | null {
  const value = decodeEntities(href.trim());
  if (!value || /^(javascript|data|vbscript):/i.test(value)) return null;

  const samePost = /^#p(\d+)$/.exec(value);
  if (samePost) {
    const postId = parseId(samePost[1]);
    return postId == null ? null : { kind: "post", postId };
  }

  const thread = THREAD_HREF.exec(value);
  if (thread) {
    const board = thread[1].toLowerCase();
    const threadId = parseId(thread[2]);
    if (!isBoardCode(board) || threadId == null) return null;
    const postId = parseId(thread[3]);
    return { kind: "thread", board, threadId, postId: postId ?? undefined };
  }

  const boardLink = BOARD_HREF.exec(value);
  if (boardLink) {
    const board = boardLink[1].toLowerCase();
    if (isBoardCode(board)) return { kind: "board", board };
  }

  if (/^\/\//.test(value)) return { kind: "url", url: `https:${value}` };
  if (/^https?:\/\//i.test(value)) return { kind: "url", url: value };
  return null;
}
