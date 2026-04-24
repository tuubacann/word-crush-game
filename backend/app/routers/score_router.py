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
            "total_duration_seconds": 0
        }

    total_games = len(scores)
    highest_score = max(score["total_score"] for score in scores)
    average_score = sum(score["total_score"] for score in scores) / total_games
    total_words = sum(score["word_count"] for score in scores)
    total_duration_seconds = sum(score["duration_seconds"] for score in scores)

    longest_word = max(
        scores,
        key=lambda score: len(score["longest_word"])
    )["longest_word"]

    return {
        "total_games": total_games,
        "highest_score": highest_score,
        "average_score": round(average_score, 2),
        "total_words": total_words,
        "longest_word": longest_word,
        "total_duration_seconds": total_duration_seconds
    }
@router.get("/leaderboard")
def get_leaderboard():
    scores = list(scores_collection.find({}, {"_id": 0}))

    # Skora göre sırala (büyükten küçüğe)
    scores = sorted(scores, key=lambda x: x["total_score"], reverse=True)

    # İlk 10
    top_scores = scores[:10]

    return top_scores
