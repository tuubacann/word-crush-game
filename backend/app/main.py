from fastapi import FastAPI
from app.routers.user_router import router as user_router
from app.routers.game_router import router as game_router
from app.routers.score_router import router as score_router
app = FastAPI(title="Word Crush API")
app.include_router(score_router, prefix="/api")

app.include_router(user_router, prefix="/api")
app.include_router(game_router, prefix="/api")

@app.get("/")
def home():
    return {"message": "Word Crush backend is running"}