from fastapi import FastAPI, Body
from app.database import users_collection

app = FastAPI(title="Word Crush API")

@app.get("/")
def home():
    return {"message": "Word Crush backend is running"}

@app.post("/api/users")
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
@app.get("/api/users")
def get_users():
    users = list(users_collection.find({}, {"_id": 0}))
    return users