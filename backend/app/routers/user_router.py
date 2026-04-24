from fastapi import APIRouter, Body
from app.database import users_collection

router = APIRouter()

@router.post("/users")
def create_user(username: str = Body(...)):
    user = {
        "username": username,
        "gold": 1000
    }

    result = users_collection.insert_one(user)

    return {
        "message": "User created",
        "user_id": str(result.inserted_id)
    }

@router.get("/users")
def get_users():
    users = list(users_collection.find({}, {"_id": 0}))
    return users