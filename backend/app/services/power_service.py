import random
from app.services.grid_service import drop_letters


def detect_power(word: str):
    word = word.upper()

    if len(word) >= 5:
        return {
            "type": "row_clear",
            "message": "Satır temizleme gücü kazandın!"
        }

    return None


def apply_power(grid, power, positions):
    if not power:
        return grid

    power_type = power.get("type")

    if power_type == "row_clear":
        row_index = positions[0]["row"]

        for col in range(len(grid[row_index])):
            grid[row_index][col] = ""

        grid = drop_letters(grid)

    return grid