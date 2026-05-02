export const TURKISH_LETTER_WEIGHTS: Record<string, number> = {
  A: 12,
  E: 12,
  İ: 10,
  L: 9,
  R: 9,
  N: 8,
  K: 6,
  M: 6,
  T: 6,
  S: 6,
  Y: 5,
  D: 5,
  O: 4,
  U: 4,
  B: 3,
  C: 3,
  Ç: 3,
  Ş: 3,
  P: 2,
  H: 2,
  G: 2,
  I: 2,
  Ü: 2,
  Ö: 2,
  F: 1,
  V: 1,
  Ğ: 1,
  J: 1,
  Z: 1,
};

export function generateLetter(): string {
  const letters = Object.keys(TURKISH_LETTER_WEIGHTS);
  const total = letters.reduce((sum, letter) => sum + TURKISH_LETTER_WEIGHTS[letter], 0);
  const roll = Math.random() * total;
  let cursor = 0;

  for (const letter of letters) {
    cursor += TURKISH_LETTER_WEIGHTS[letter];
    if (roll <= cursor) {
      return letter;
    }
  }

  return letters[0];
}

export function generateGrid(size: number): string[][] {
  const grid =  Array.from({ length: size }, () =>
    Array.from({ length: size }, () => generateLetter())
  );

  // Hardcode some valid Turkish words for testing animations locally
  if (size >= 6) {
    const words = ["ELMA", "ARMUT", "ARABA", "KEDİ"];
    let r = 1;
    for (const word of words) {
      if (r < size - 1) {
         for (let c = 0; c < word.length && c < size; c++) {
           grid[r][c] = word[c];
         }
         r += 2;
      }
    }
  }

  return grid;
}
