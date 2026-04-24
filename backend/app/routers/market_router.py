from fastapi import APIRouter, Body
from app.database import users_collection
from bson import ObjectId

router = APIRouter()

JOKERS = [
    {
        "id": "fish",
        "name": "Balık",
        "cost": 100,
        "description": "Gridde rastgele harfleri yok eder."
    },
    {
        "id": "wheel",
        "name": "Tekerlek",
        "cost": 200,
        "description": "Seçilen harfin satır ve sütununu temizler."
    },
    {
        "id": "lollipop",
        "name": "Lolipop Kırıcı",
        "cost": 75,
        "description": "Seçilen bir harfi yok eder."
    },
    {
        "id": "swap",
        "name": "Serbest Değiştirme",
        "cost": 125,
        "description": "Komşu iki harfin yerini değiştirir."
    },
    {
        "id": "shuffle",
        "name": "Harf Karıştırma",
        "cost": 300,
        "description": "Griddeki harfleri karıştırır."
    },
    {
        "id": "party",
        "name": "Parti Güçlendiricisi",
        "cost": 400,
        "description": "Tüm grid temizlenir ve yeniden doldurulur."
    }
]

@router.get("/market/jokers")
def get_jokers():
    return JOKERS


@router.post("/market/buy")
def buy_joker(data: dict = Body(...)):
    user_id = data["user_id"]
    joker_id = data["joker_id"]

    joker = next((j for j in JOKERS if j["id"] == joker_id), None)

    if not joker:
        return {"message": "Joker not found"}

    user = users_collection.find_one({"_id": ObjectId(user_id)})

    if not user:
        return {"message": "User not found"}

    if user["gold"] < joker["cost"]:
        return {"message": "Not enough gold"}

    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$inc": {"gold": -joker["cost"]},
            "$push": {"jokers": joker_id}
        }
    )

    return {
        "message": "Joker purchased",
        "joker": joker,
        "remaining_gold": user["gold"] - joker["cost"]
    }