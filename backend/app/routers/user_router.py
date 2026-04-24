from fastapi import APIRouter, Body
from app.database import users_collection
from bson import ObjectId

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
from bson import ObjectId

@router.get("/users/{user_id}")
def get_user(user_id: str):
    user = users_collection.find_one({"_id": ObjectId(user_id)})

    if not user:
        return {"message": "User not found"}

    user["_id"] = str(user["_id"])
    return user
@router.put("/users/{user_id}")
def update_user(user_id: str, username: str = Body(...)):
    result = users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"username": username}}
    )

    if result.matched_count == 0:
        return {"message": "User not found"}

    return {"message": "User updated"}
@router.delete("/users/{user_id}")
def delete_user(user_id: str):
    result = users_collection.delete_one({"_id": ObjectId(user_id)})

    if result.deleted_count == 0:
        return {"message": "User not found"}

    return {"message": "User deleted"}