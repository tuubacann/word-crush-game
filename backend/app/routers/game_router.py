from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Body

from app.database import games_collection
from app.services.grid_service import generate_grid, process_move
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


@router.post("/game/process-move")
def process_game_move(data: dict = Body(...)):
    grid = data["grid"]
    positions = data["positions"]

    new_grid = process_move(grid, positions)

    return {
        "message": "Move processed",
        "grid": new_grid
    }


@router.post("/game/start")
def start_game(data: dict = Body(...)):
    user_id = data["user_id"]
    grid_size = data["grid_size"]

    if grid_size == 6:
        move_count = 15
    elif grid_size == 8:
        move_count = 20
    elif grid_size == 10:
        move_count = 25
    else:
        return {"message": "Invalid grid size"}

    grid = generate_grid(grid_size)

    game = {
        "user_id": user_id,
        "grid_size": grid_size,
        "grid": grid,
        "move_count": move_count,
        "score": 0,
        "found_words": [],
        "status": "active",
        "started_at": datetime.now()
    }

    result = games_collection.insert_one(game)

    return {
        "message": "Game started",
        "game_id": str(result.inserted_id),
        "grid_size": grid_size,
        "move_count": move_count,
        "score": 0,
        "grid": grid
    }


@router.post("/game/move")
def play_move(data: dict = Body(...)):
    game_id = data["game_id"]
    letters = data["letters"]
    positions = data["positions"]

    game = games_collection.find_one({"_id": ObjectId(game_id)})

    if not game:
        return {"message": "Game not found"}

    if game["status"] != "active":
        return {"message": "Game is not active"}

    word = "".join(letters)
    result = check_word(word)

    new_move_count = game["move_count"] - 1
    game_over = new_move_count <= 0

    if result["valid"]:
        new_score = game["score"] + result["total_score"]
        new_grid = process_move(game["grid"], positions)

        games_collection.update_one(
            {"_id": ObjectId(game_id)},
            {
                "$set": {
                    "grid": new_grid,
                    "score": new_score,
                    "move_count": new_move_count,
                    "status": "finished" if game_over else "active"
                },
                "$push": {
                    "found_words": result["word"]
                }
            }
        )

        return {
            "valid": True,
            "word": result["word"],
            "score_added": result["total_score"],
            "total_score": new_score,
            "move_count": new_move_count,
            "game_over": game_over,
            "grid": new_grid
        }

    games_collection.update_one(
        {"_id": ObjectId(game_id)},
        {
            "$set": {
                "move_count": new_move_count,
                "status": "finished" if game_over else "active"
            }
        }
    )

    return {
        "valid": False,
        "message": result["message"],
        "move_count": new_move_count,
        "game_over": game_over,
        "grid": game["grid"]
    }