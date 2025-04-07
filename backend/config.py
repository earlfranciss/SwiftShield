"""
from pymongo import MongoClient

MONGO_URI = "mongodb+srv://swiftshield:<db_password>@cluster0.owfp0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
DATABASE_NAME = "SwiftShield"

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]

reports_collection = db["reports"]

try:
    client.admin.command("ping")
    print("✅ Successfully connected to MongoDB")
except Exception as e:
    print("❌ Error connecting to MongoDB:", e)
"""