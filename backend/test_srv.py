
import certifi
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

uri = os.getenv("MONGO_URI")

print("Testing standard MongoDB Atlas SRV connection...")

try:
    client = MongoClient(
        uri,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=20000,
        connectTimeoutMS=10000,
        retryReads=True,
        retryWrites=True
    )

    print("PING:", client.admin.command("ping"))
    print("CONNECTION SUCCESSFUL")

except Exception as error:
    print("CONNECTION FAILED")
    print(type(error).__name__)
    print(error)

finally:
    if "client" in locals():
        client.close()
