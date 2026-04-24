from fastapi import APIRouter
from app.services.grid_service import generate_grid
from fastapi import APIRouter, Body
from app.services.grid_service import generate_grid
from app.services.word_service import check_word
router = APIRouter()

@router.get("/game/grid")
def get_grid(size: int = 8):
    grid = generate_grid(size)
    return {
        "size": size,
        "grid": grid
    }
@router.post("/game/check-word")
def check_selected_word(letters: list[str] = Body(...)):
    word = "".join(letters)
    result = check_word(word)
    return result