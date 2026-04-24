import random

TURKISH_LETTER_WEIGHTS = {
    "A": 12, "E": 12, "İ": 10, "L": 9, "R": 9, "N": 8,
    "K": 6, "M": 6, "T": 6, "S": 6, "Y": 5, "D": 5,
    "O": 4, "U": 4, "B": 3, "C": 3, "Ç": 3, "Ş": 3,
    "P": 2, "H": 2, "G": 2, "I": 2, "Ü": 2, "Ö": 2,
    "F": 1, "V": 1, "Ğ": 1, "J": 1, "Z": 1
}

def generate_letter():
    letters = list(TURKISH_LETTER_WEIGHTS.keys())
    weights = list(TURKISH_LETTER_WEIGHTS.values())
    return random.choices(letters, weights=weights, k=1)[0]

def generate_grid(size: int):
    grid = []

    for _ in range(size):
        row = []
        for _ in range(size):
            row.append(generate_letter())
        grid.append(row)

    return grid