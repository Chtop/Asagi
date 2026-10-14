/** Codes board de l'API : courts, alphanumériques, jamais un chemin. */
const BOARD_RE = /^[a-z0-9]{1,8}$/;
const THREAD_RE = /^[1-9]\d{0,15}$/;

export function isBoardCode(value: string): boolean {
  return BOARD_RE.test(value);
}

export function isThreadId(value: string): boolean {
  return THREAD_RE.test(value);
}

export function parseThreadId(value: string): number | null {
  if (!isThreadId(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
