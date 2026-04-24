from fastapi import FastAPI

app = FastAPI(title="Word Crush API")

@app.get("/")
def home():
    return {"message": "Word Crush backend is running"}