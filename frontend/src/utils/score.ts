export const LETTER_SCORES: Record<string, number> = {
    "A": 1, "B": 3, "C": 4, "Ç": 4, "D": 3, "E": 1,
    "F": 7, "G": 5, "Ğ": 8, "H": 5, "I": 2, "İ": 1,
    "J": 10, "K": 1, "L": 1, "M": 2, "N": 1, "O": 2,
    "Ö": 7, "P": 5, "R": 1, "S": 2, "Ş": 4, "T": 1,
    "U": 2, "Ü": 3, "V": 7, "Y": 3, "Z": 4
};

/**
 * Calculates the base score of a word based on the letter values.
 * @param word The word to calculate the score for.
 * @returns The total score of the word.
 */
export function calculateScore(word: string): number {
    let total = 0;
    // Normalize word just like the backend does: strip whitespace and uppercase
    const normalizedWord = word.trim().toUpperCase();
    
    for (const letter of normalizedWord) {
        total += LETTER_SCORES[letter] || 0;
    }
    
    return total;
}
