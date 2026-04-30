import random
from app.database import words_collection

TURKISH_LETTER_WEIGHTS = {
    "A": 12, "E": 12, "İ": 10, "L": 9, "R": 9, "N": 8,
    "K": 6, "M": 6, "T": 6, "S": 6, "Y": 5, "D": 5,
    "O": 4, "U": 4, "B": 3, "C": 3, "Ç": 3, "Ş": 3,
    "P": 2, "H": 2, "G": 2, "I": 2, "Ü": 2, "Ö": 2,
    "F": 1, "V": 1, "Ğ": 1, "J": 1, "Z": 1
}

LETTERS = list(TURKISH_LETTER_WEIGHTS.keys())

_dictionary_cache = None
_prefix_cache = None


def generate_letter():
    letters = list(TURKISH_LETTER_WEIGHTS.keys())
    weights = list(TURKISH_LETTER_WEIGHTS.values())
    return random.choices(letters, weights=weights, k=1)[0]


def get_neighbors(row, col, size):
    directions = [
        (-1, 0), (1, 0), (0, -1), (0, 1),
        (-1, -1), (-1, 1), (1, -1), (1, 1)
    ]

    neighbors = []

    for dr, dc in directions:
        nr = row + dr
        nc = col + dc

        if 0 <= nr < size and 0 <= nc < size:
            neighbors.append((nr, nc))

    return neighbors


def load_dictionary(max_length=8):
    global _dictionary_cache, _prefix_cache

    if _dictionary_cache is not None and _prefix_cache is not None:
        return _dictionary_cache, _prefix_cache

    words = words_collection.find(
        {
            "word": {
                "$regex": "^[ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]+$"
            }
        },
        {"_id": 0, "word": 1}
    )

    dictionary_words = set()

    for item in words:
        word = item["word"].strip().upper()

        if 3 <= len(word) <= max_length:
            dictionary_words.add(word)

    prefixes = set()

    for word in dictionary_words:
        for i in range(1, len(word) + 1):
            prefixes.add(word[:i])

    _dictionary_cache = dictionary_words
    _prefix_cache = prefixes

    return _dictionary_cache, _prefix_cache


def find_words_on_grid(grid, max_length=8, limit=50):
    size = len(grid)
    dictionary_words, prefixes = load_dictionary(max_length)

    found_words = set()

    def dfs(row, col, current_word, visited):
        if len(found_words) >= limit:
            return

        current_word += get_cell_letter(grid[row][col])

        if current_word not in prefixes:
            return

        if len(current_word) >= 3 and current_word in dictionary_words:
            found_words.add(current_word)

        if len(current_word) >= max_length:
            return

        for nr, nc in get_neighbors(row, col, size):
            if (nr, nc) not in visited:
                dfs(nr, nc, current_word, visited | {(nr, nc)})

    for row in range(size):
        for col in range(size):
            dfs(row, col, "", {(row, col)})

    return list(found_words)


def has_possible_word(grid):
    return len(find_words_on_grid(grid, limit=1)) > 0


def generate_random_grid(size: int):
    grid = []

    for _ in range(size):
        row = []

        for _ in range(size):
            row.append(generate_letter())

        grid.append(row)

    return grid


def generate_grid(size: int):
    for _ in range(50):
        grid = generate_random_grid(size)

        if has_possible_word(grid):
            return grid

    return generate_random_grid(size)


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
                grid[row][col] = generate_letter()

    return grid


def process_move(grid, positions):
    for row, col in positions:
        grid[row][col] = ""

    grid = drop_letters(grid)
    grid = fill_empty(grid)

    if not has_possible_word(grid):
        grid = generate_grid(len(grid))

    return grid
def get_cell_letter(cell):
    if isinstance(cell, dict):
        return cell.get("letter", "")
    return cell


def create_special_power(word_length):
    if word_length == 4:
        return "row_clear"
    if word_length == 5:
        return "area_bomb"
    if word_length == 6:
        return "column_clear"
    if word_length >= 7:
        return "mega_bomb"
    return None


def clear_cells(grid, cells):
    size = len(grid)

    for row, col in cells:
        if 0 <= row < size and 0 <= col < size:
            grid[row][col] = ""

    grid = drop_letters(grid)
    grid = fill_empty(grid)

    if not has_possible_word(grid):
        grid = generate_grid(len(grid))

    return grid


def get_power_cells(row, col, size, power_type):
    cells = set()

    if power_type == "row_clear":
        for c in range(size):
            cells.add((row, c))

    elif power_type == "column_clear":
        for r in range(size):
            cells.add((r, col))

    elif power_type == "area_bomb":
        for r in range(row - 1, row + 2):
            for c in range(col - 1, col + 2):
                if 0 <= r < size and 0 <= c < size:
                    cells.add((r, c))

    elif power_type == "mega_bomb":
        for r in range(row - 2, row + 3):
            for c in range(col - 2, col + 3):
                if 0 <= r < size and 0 <= c < size:
                    cells.add((r, c))

    return list(cells)


def apply_power(grid, row, col):
    cell = grid[row][col]

    if not isinstance(cell, dict) or "power" not in cell:
        return {
            "success": False,
            "message": "Selected cell has no power",
            "grid": grid
        }

    power_type = cell["power"]
    cells_to_clear = get_power_cells(row, col, len(grid), power_type)
    new_grid = clear_cells(grid, cells_to_clear)

    return {
        "success": True,
        "message": "Power used",
        "power_type": power_type,
        "grid": new_grid
    }


def process_move(grid, positions, special_power=None):
    last_row, last_col = positions[-1]
    last_letter = get_cell_letter(grid[last_row][last_col])

    for row, col in positions:
        grid[row][col] = ""

    if special_power:
        grid[last_row][last_col] = {
            "letter": last_letter,
            "power": special_power
        }

    grid = drop_letters(grid)
    grid = fill_empty(grid)

    if not has_possible_word(grid):
        grid = generate_grid(len(grid))

    return grid


def apply_joker(grid, joker_id, positions=None):
    size = len(grid)

    if positions is None:
        positions = []

    if joker_id == "fish":
        all_cells = [(r, c) for r in range(size) for c in range(size)]
        cells_to_clear = random.sample(all_cells, min(5, len(all_cells)))
        return clear_cells(grid, cells_to_clear)

    if joker_id == "wheel":
        if len(positions) == 0:
            return grid

        row, col = positions[0]
        cells_to_clear = []

        for c in range(size):
            cells_to_clear.append((row, c))

        for r in range(size):
            cells_to_clear.append((r, col))

        return clear_cells(grid, cells_to_clear)

    if joker_id == "lollipop":
        if len(positions) == 0:
            return grid

        return clear_cells(grid, [positions[0]])

    if joker_id == "swap":
        if len(positions) < 2:
            return grid

        r1, c1 = positions[0]
        r2, c2 = positions[1]

        grid[r1][c1], grid[r2][c2] = grid[r2][c2], grid[r1][c1]
        return grid

    if joker_id == "shuffle":
        cells = []

        for r in range(size):
            for c in range(size):
                cells.append(grid[r][c])

        random.shuffle(cells)

        index = 0
        for r in range(size):
            for c in range(size):
                grid[r][c] = cells[index]
                index += 1

        if not has_possible_word(grid):
            grid = generate_grid(size)

        return grid

    if joker_id == "party":
        return generate_grid(size)

    return grid