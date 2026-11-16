
import os
import certifi

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

original_uri = os.getenv("MONGO_URI")

hosts = [
    "ac-a98t1qe-shard-00-00.xd6zob4.mongodb.net",
    "ac-a98t1qe-shard-00-01.xd6zob4.mongodb.net"
]

for host in hosts:

    print(f"\nChecking node: {host}")

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
            serverSelectionTimeoutMS=10000
        )

        hello = client.admin.command("hello")

        print("IS PRIMARY:", hello.get("isWritablePrimary"))
        print("PRIMARY HOST:", hello.get("primary"))
        print("REPLICA SET:", hello.get("setName"))

    except Exception as error:
        print("ERROR:", error)

    finally:
        if client:
            client.close()
