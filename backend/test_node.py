import os
import certifi

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

uri = os.getenv("MONGO_URI")
uri = uri.replace("mongodb+srv://", "mongodb://")

uri = uri.replace(
    "cluster0.xd6zob4.mongodb.net",
    "ac-a98t1qe-shard-00-01.xd6zob4.mongodb.net"
)

separator = "&" if "?" in uri else "?"
uri += separator + "directConnection=true"

client = MongoClient(
    uri,
    tls=True,
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=20000
)

try:
    info = client.admin.command("hello")

    print("PRIMARY:", info.get("isWritablePrimary"))
    print("REPLICA SET:", info.get("setName"))
    print("PRIMARY HOST:", info.get("primary"))
    print("NODES:", info.get("hosts"))

except Exception as error:
    print("ERROR:", error)

finally:
    client.close()