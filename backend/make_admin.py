
import os
import certifi
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

client = MongoClient(
    os.getenv("MONGO_URI"),
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=60000,
    connectTimeoutMS=30000,
    retryReads=True,
    retryWrites=True
)

db = client[os.getenv("MONGO_DB_NAME", "docusphere_db")]

result = db.users.update_one(
    {"email": "nausheen.test@example.com"},
    {"$set": {"role": "admin"}}
)

print("Matched:", result.matched_count)
print("Updated:", result.modified_count)

client.close()
