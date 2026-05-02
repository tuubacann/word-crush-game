from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Body

from app.database import games_collection, scores_collection, users_collection
from app.services.grid_service import (
    generate_grid,
    process_move,
    find_words_on_grid,
    ensure_playable_grid,
    create_special_power,
    apply_joker,
    apply_power
)
from app.services.word_service import check_word, calculate_score

router = APIRouter()


def get_best_longest_word(found_words):
    if not found_words:
        return {
            "word": "",
            "score": 0
        }

    normalized_words = []

    for item in found_words:
        if isinstance(item, dict):
            word = item.get("word", "")
            score = item.get("score", calculate_score(word))
        else:
            word = item
            score = calculate_score(word)

        normalized_words.append({
            "word": word,
            "score": score
        })

    return max(
        normalized_words,
        key=lambda item: (
            len(item["word"]),
            item["score"]
        )
    )


@router.get("/game/grid")
def get_grid(size: int):
    grid = generate_grid(size)
    grid, possible_words = ensure_playable_grid(grid)

    return {
        "size": size,
        "grid": grid,
        "possible_word_count": len(possible_words),
        "possible_words": possible_words
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
    new_grid, possible_words = ensure_playable_grid(new_grid)

    return {
        "message": "Move processed",
        "grid": new_grid,
        "possible_word_count": len(possible_words),
        "possible_words": possible_words
    }


@router.post("/game/start")
def start_game(data: dict = Body(...)):
    user_id = data["user_id"]
    username = data.get("username", "unknown")
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
    grid, possible_words = ensure_playable_grid(grid)

    game = {
        "user_id": user_id,
        "username": username,
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
        "grid": grid,
        "possible_word_count": len(possible_words),
        "possible_words": possible_words
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
        special_power = create_special_power(len(result["word"]))

        new_grid = process_move(game["grid"], positions, special_power)
        new_grid, possible_words = ensure_playable_grid(new_grid)

        new_found_word = {
            "word": result["word"],
            "score": result["total_score"]
        }

        updated_found_words = game.get("found_words", []) + [new_found_word]

        games_collection.update_one(
            {"_id": ObjectId(game_id)},
            {
                "$set": {
                    "grid": new_grid,
                    "score": new_score,
                    "move_count": new_move_count,
                    "status": "finished" if game_over else "active",
                    "finished_at": datetime.now() if game_over else None
                },
                "$push": {
                    "found_words": new_found_word
                }
            }
        )

        if game_over:
            started_at = game.get("started_at", datetime.now())
            duration_seconds = int((datetime.now() - started_at).total_seconds())
            best_word = get_best_longest_word(updated_found_words)

            scores_collection.insert_one({
                "user_id": game["user_id"],
                "username": game.get("username", "unknown"),
                "grid_size": game["grid_size"],
                "total_score": new_score,
                "word_count": len(updated_found_words),
                "longest_word": best_word["word"],
                "longest_word_score": best_word["score"],
                "duration_seconds": duration_seconds
            })

        return {
            "valid": True,
            "message": "Word accepted",
            "word": result["word"],
            "word_score": result["score"],
            "combos": result["combos"],
            "combo_score": result["combo_score"],
            "score_added": result["total_score"],
            "total_score": new_score,
            "move_count": new_move_count,
            "game_over": game_over,
            "grid": new_grid,
            "possible_word_count": len(possible_words),
            "possible_words": possible_words,
            "special_power_created": special_power
        }

    grid, possible_words = ensure_playable_grid(game["grid"])

    games_collection.update_one(
        {"_id": ObjectId(game_id)},
        {
            "$set": {
                "grid": grid,
                "move_count": new_move_count,
                "status": "finished" if game_over else "active",
                "finished_at": datetime.now() if game_over else None
            }
        }
    )

    if game_over:
        started_at = game.get("started_at", datetime.now())
        duration_seconds = int((datetime.now() - started_at).total_seconds())
        found_words = game.get("found_words", [])
        best_word = get_best_longest_word(found_words)

        scores_collection.insert_one({
            "user_id": game["user_id"],
            "username": game.get("username", "unknown"),
            "grid_size": game["grid_size"],
            "total_score": game["score"],
            "word_count": len(found_words),
            "longest_word": best_word["word"],
            "longest_word_score": best_word["score"],
            "duration_seconds": duration_seconds
        })

    return {
        "valid": False,
        "message": result["message"],
        "score_added": 0,
        "total_score": game["score"],
        "move_count": new_move_count,
        "game_over": game_over,
        "grid": grid,
        "possible_word_count": len(possible_words),
        "possible_words": possible_words
    }


@router.post("/game/finish")
def finish_game(data: dict = Body(...)):
    game_id = data["game_id"]

    game = games_collection.find_one({"_id": ObjectId(game_id)})

    if not game:
        return {"message": "Game not found"}

    if game["status"] == "finished":
        return {"message": "Game already finished"}

    started_at = game.get("started_at", datetime.now())
    duration_seconds = int((datetime.now() - started_at).total_seconds())

    found_words = game.get("found_words", [])
    best_word = get_best_longest_word(found_words)

    scores_collection.insert_one({
        "user_id": game["user_id"],
        "username": game.get("username", "unknown"),
        "grid_size": game["grid_size"],
        "total_score": game["score"],
        "word_count": len(found_words),
        "longest_word": best_word["word"],
        "longest_word_score": best_word["score"],
        "duration_seconds": duration_seconds
    })

    games_collection.update_one(
        {"_id": ObjectId(game_id)},
        {
            "$set": {
                "status": "finished",
                "finished_at": datetime.now()
            }
        }
    )

    return {
        "message": "Game finished",
        "game_over": True,
        "total_score": game["score"],
        "word_count": len(found_words),
        "longest_word": best_word["word"],
        "longest_word_score": best_word["score"],
        "duration_seconds": duration_seconds
    }


@router.post("/game/use-joker")
def use_joker(data: dict = Body(...)):
    game_id = data["game_id"]
    joker_id = data["joker_id"]
    positions = data.get("positions", [])

    game = games_collection.find_one({"_id": ObjectId(game_id)})

    if not game:
        return {"message": "Game not found"}

    if game["status"] != "active":
        return {"message": "Game is not active"}

    user = users_collection.find_one({"_id": ObjectId(game["user_id"])})

    if not user:
        return {"message": "User not found"}

    user_jokers = user.get("jokers", [])

    if joker_id not in user_jokers:
        return {"message": "User does not have this joker"}

    new_grid = apply_joker(game["grid"], joker_id, positions)
    new_grid, possible_words = ensure_playable_grid(new_grid)

    games_collection.update_one(
        {"_id": ObjectId(game_id)},
        {
            "$set": {
                "grid": new_grid
            }
        }
    )


    user_jokers.remove(joker_id)

    users_collection.update_one(
        {"_id": ObjectId(game["user_id"])},
        {
            "$set": {
                "jokers": user_jokers
            }
        }
    )

    return {
        "message": "Joker used",
        "joker_id": joker_id,
        "grid": new_grid,
        "possible_word_count": len(possible_words),
        "possible_words": possible_words
    }


@router.post("/game/use-power")
def use_power(data: dict = Body(...)):
    game_id = data["game_id"]
    row = data["row"]
    col = data["col"]

    game = games_collection.find_one({"_id": ObjectId(game_id)})

    if not game:
        return {"message": "Game not found"}

    if game["status"] != "active":
        return {"message": "Game is not active"}

    result = apply_power(game["grid"], row, col)

    if not result["success"]:
        return result

    new_grid = result["grid"]
    new_grid, possible_words = ensure_playable_grid(new_grid)

    games_collection.update_one(
        {"_id": ObjectId(game_id)},
        {
            "$set": {
                "grid": new_grid
            }
        }
    )

    return {
        "message": result["message"],
        "power_type": result["power_type"],
        "grid": new_grid,
        "possible_word_count": len(possible_words),
        "possible_words": possible_words
    }