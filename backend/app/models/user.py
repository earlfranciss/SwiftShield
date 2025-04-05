from app import db
from bson.objectid import ObjectId
from datetime import datetime, timedelta

users = db.get_collection("Users")

class User:
    @staticmethod
    def find_by_email(email):
        return users.find_one({"email": email})

    @staticmethod
    def create(email, password, first_name, last_name):
        user = {
            "_id": ObjectId(),
            "email": email,
            "password": password,
            "firstName": first_name,
            "lastName": last_name,
            "created_at": datetime.now(),
        }
        users.insert_one(user)
        return user
