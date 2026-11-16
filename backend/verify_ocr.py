from app import create_app
import app.extensions as extensions
from bson import ObjectId

app = create_app()

with app.app_context():
    doc = extensions.db.documents.find_one(
        {"_id": ObjectId("6afafb9077ddc792c96922c4")},
        {
            "filename": 1,
            "extracted_text": 1,
            "ocr_status": 1,
            "ocr_error": 1
        }
    )

    if doc:
        print("Filename:", doc.get("filename"))
        print("OCR Status:", doc.get("ocr_status"))
        print("Stored Text Length:", len(doc.get("extracted_text", "")))
        print("OCR Error:", doc.get("ocr_error"))
    else:
        print("Document not found")