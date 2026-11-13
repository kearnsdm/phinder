export function packRaw(raw: {
  words: string;
  soundList: string;
  ipaList: string;
  gpcCharBase: number;
  isBlocked?: (word: string) => boolean;
}): {
  payload: {
    v: number;
    phonemes: [string, string, string][];
    gpcs: [string, string][];
    listedCount: number;
    words: string;
  };
  report: { words: number; skipped: number; blocked: number; problems: Record<string, number> };
};
