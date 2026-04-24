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
import random

LETTERS = list("ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ")

def drop_letters(grid):
    size = len(grid)

    for col in range(size):
        empty_slots = []

        for row in range(size - 1, -1, -1):
            if grid[row][col] == "":
                empty_slots.append(row)
            elif empty_slots:
                empty_row = empty_slots.pop(0)
                grid[empty_row][col] = grid[row][col]
                grid[row][col] = ""
                empty_slots.append(row)

    return grid


def fill_empty(grid):
    size = len(grid)

    for row in range(size):
        for col in range(size):
            if grid[row][col] == "":
                grid[row][col] = random.choice(LETTERS)

    return grid


def process_move(grid, positions):
    # positions = [(row, col), ...]

    for row, col in positions:
        grid[row][col] = ""

    grid = drop_letters(grid)
    grid = fill_empty(grid)

    return grid