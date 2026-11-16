
import certifi
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

mongo_uri = os.getenv("MONGO_URI")

mongo_uri = mongo_uri.replace(
    "mongodb+srv://",
    "mongodb://"
)

mongo_uri = mongo_uri.replace(
    "cluster0.xd6zob4.mongodb.net",
    "ac-a98t1qe-shard-00-02.xd6zob4.mongodb.net:27017"
)

separator = "&" if "?" in mongo_uri else "?"
mongo_uri += separator + "directConnection=true"

try:
    client = MongoClient(
        mongo_uri,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=15000,
        connectTimeoutMS=15000
    )

    print("Testing MongoDB connection...")

    result = client.admin.command("ping")

    print("CONNECTION SUCCESSFUL")
    print("PING:", result)

except Exception as error:
    print("CONNECTION FAILED")
    print(type(error).__name__)
    print(error)

finally:
    if "client" in locals():
        client.close()
