
import os
import certifi
import pymongo

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

print("PyMongo version:", pymongo.version)

original_uri = os.getenv("MONGO_URI")

if not original_uri:
    raise RuntimeError("MONGO_URI is missing from .env")

hosts = [
    "ac-a98t1qe-shard-00-00.xd6zob4.mongodb.net",
    "ac-a98t1qe-shard-00-01.xd6zob4.mongodb.net",
    "ac-a98t1qe-shard-00-02.xd6zob4.mongodb.net"
]

for host in hosts:

    print(f"\nTesting PyMongo against {host}")

    uri = original_uri.replace(
        "mongodb+srv://",
        "mongodb://"
    )

    uri = uri.replace(
        "cluster0.xd6zob4.mongodb.net",
        f"{host}:27017"
    )

    separator = "&" if "?" in uri else "?"
    uri += separator + "directConnection=true"

    client = None

    try:
        client = MongoClient(
            uri,
            tls=True,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=8000,
            retryReads=False,
            retryWrites=False
        )

        result = client.admin.command("ping")

        print("SUCCESS:", result)

    except Exception as error:
        print("FAILED:", type(error).__name__)
        print(error)

    finally:
        if client:
            client.close()
