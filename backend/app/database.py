from pymongo import MongoClient

MONGO_URL = "mongodb://mongodb:27017"
DATABASE_NAME = "word_crush_db"

client = MongoClient(MONGO_URL)
db = client[DATABASE_NAME]

users_collection = db["users"]
scores_collection = db["scores"]
market_collection = db["market"]
