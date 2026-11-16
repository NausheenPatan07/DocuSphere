
import time
import certifi

from pymongo import MongoClient, ASCENDING, DESCENDING
from gridfs import GridFS

mongo_client = None
db = None
fs = None


def init_db(app):
    global mongo_client, db, fs

    mongo_uri = app.config["MONGO_URI"]
    db_name = app.config["MONGO_DB_NAME"]

    if not mongo_uri:
        raise ValueError("MONGO_URI is missing")

    # Keep the original MongoDB Atlas SRV URI.
    # Do not replace it with an individual node address.

    last_error = None

    for attempt in range(1, 6):
        try:
            app.logger.info(
                "Connecting to MongoDB (attempt %s/5)...",
                attempt
            )

            client = MongoClient(
                mongo_uri,
                tls=True,
                tlsCAFile=certifi.where(),
                serverSelectionTimeoutMS=20000,
                connectTimeoutMS=15000,
                socketTimeoutMS=20000,
                retryReads=True,
                retryWrites=True,
                maxPoolSize=50
            )

            # Force an actual connection attempt.
            client.admin.command("ping")

            mongo_client = client
            db = mongo_client[db_name]

            app.logger.info("MongoDB connected successfully")
            break

        except Exception as error:
            last_error = error

            app.logger.warning(
                "MongoDB connection attempt %s failed: %s",
                attempt,
                error
            )

            if "client" in locals():
                client.close()

            if attempt < 5:
                time.sleep(min(2 ** attempt, 8))

    else:
        raise RuntimeError(
            "Could not connect to MongoDB after 5 attempts"
        ) from last_error

    # Create database indexes.

    db.users.create_index(
        [("email", ASCENDING)],
        unique=True,
        name="unique_user_email"
    )

    db.access_requests.create_index(
        [("active_request_key", ASCENDING)],
        unique=True,
        partialFilterExpression={
            "active_request_key": {"$type": "string"}
        },
        name="unique_active_access_request"
    )

    db.documents.create_index(
        [("division_id", ASCENDING), ("_id", -1)],
        name="division_document_listing"
    )

    db.documents.create_index(
        [("filename", ASCENDING)],
        name="document_filename"
    )

    # Check for an equivalent created_at descending index on audit_logs before creating
    try:
        existing_audit_indexes = db.audit_logs.index_information()
        has_created_at_desc = any(
            idx.get("key") == [("created_at", DESCENDING)] or idx.get("key") == [("created_at", -1)]
            for idx in existing_audit_indexes.values()
        )
        if not has_created_at_desc:
            db.audit_logs.create_index(
                [("created_at", DESCENDING)],
                name="audit_created_at_desc"
            )
            app.logger.info("Created audit_created_at_desc index on audit_logs")
        else:
            app.logger.info("audit_created_at_desc index already exists on audit_logs")
    except Exception as e:
        app.logger.warning("Could not verify/create audit_logs index: %s", e)

    fs = GridFS(db)

    app.logger.info("Database indexes created successfully")
    app.logger.info("GridFS initialized successfully")
