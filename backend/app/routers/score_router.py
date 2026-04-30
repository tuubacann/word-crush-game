from fastapi import APIRouter, Body
from app.database import scores_collection

router = APIRouter()


@router.post("/scores")
def save_score(data: dict = Body(...)):
    score = {
        "user_id": data["user_id"],
        "username": data["username"],
        "grid_size": data["grid_size"],
        "total_score": data["total_score"],
        "word_count": data["word_count"],
        "longest_word": data["longest_word"],
        "longest_word_score": data.get("longest_word_score", 0),
        "duration_seconds": data["duration_seconds"]
    }

    result = scores_collection.insert_one(score)

    return {
        "message": "Score saved",
        "score_id": str(result.inserted_id)
    }


@router.get("/scores/{user_id}")
def get_user_scores(user_id: str):
    scores = list(scores_collection.find(
        {"user_id": user_id},
        {"_id": 0}
    ))

    return scores


@router.get("/scores/{user_id}/summary")
def get_score_summary(user_id: str):
    scores = list(scores_collection.find(
        {"user_id": user_id},
        {"_id": 0}
    ))

    if len(scores) == 0:
        return {
            "total_games": 0,
            "highest_score": 0,
            "average_score": 0,
            "total_words": 0,
            "longest_word": "",
            "longest_word_score": 0,
            "total_duration_seconds": 0
        }

    total_games = len(scores)
    highest_score = max(score.get("total_score", 0) for score in scores)
    average_score = sum(score.get("total_score", 0) for score in scores) / total_games
    total_words = sum(score.get("word_count", 0) for score in scores)
    total_duration_seconds = sum(score.get("duration_seconds", 0) for score in scores)

    best_score_item = max(
        scores,
        key=lambda score: (
            len(score.get("longest_word", "")),
            score.get("longest_word_score", 0)
        )
    )

    longest_word = best_score_item.get("longest_word", "")
    longest_word_score = best_score_item.get("longest_word_score", 0)

    return {
        "total_games": total_games,
        "highest_score": highest_score,
        "average_score": round(average_score, 2),
        "total_words": total_words,
        "longest_word": longest_word,
        "longest_word_score": longest_word_score,
        "total_duration_seconds": total_duration_seconds
    }


@router.get("/leaderboard")
def get_leaderboard():
    scores = list(scores_collection.find({}, {"_id": 0}))

    scores = sorted(
        scores,
        key=lambda score: score.get("total_score", 0),
        reverse=True
    )

    return scores[:10]