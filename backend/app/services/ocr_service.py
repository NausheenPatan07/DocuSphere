
import io
import os

import pymupdf
import pytesseract

from PIL import Image, ImageOps


# Configure Tesseract executable for Windows.
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

if os.path.exists(TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


SUPPORTED_IMAGE_TYPES = {
    "image/png",
    "image/jpeg",
    "image/tiff"
}


def extract_pdf_text(file_bytes):
    """
    Extract selectable PDF text first.
    If a page has no selectable text, use Tesseract OCR.
    """

    extracted_pages = []

    with pymupdf.open(stream=file_bytes, filetype="pdf") as pdf:

        for page in pdf:
            page_text = page.get_text("text").strip()

            if page_text:
                extracted_pages.append(page_text)

            else:
                # Render scanned PDF page as an image.
                pix = page.get_pixmap(
                    matrix=pymupdf.Matrix(2, 2),
                    alpha=False
                )

                image = Image.open(
                    io.BytesIO(pix.tobytes("png"))
                )

                page_text = pytesseract.image_to_string(
                    image,
                    lang="eng"
                ).strip()

                extracted_pages.append(page_text)

    return "\n\n".join(extracted_pages).strip()


def extract_image_text(file_bytes):
    """Extract text from a supported image using Tesseract."""

    image = Image.open(io.BytesIO(file_bytes))
    image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")

    return pytesseract.image_to_string(
        image,
        lang="eng"
    ).strip()


def extract_document_text(file_bytes, content_type):
    """
    Return extracted text and OCR status.

    Supported: PDF and PNG/JPEG/TIFF images.
    """

    try:

        if content_type == "application/pdf":
            text = extract_pdf_text(file_bytes)

        elif content_type in SUPPORTED_IMAGE_TYPES:
            text = extract_image_text(file_bytes)

        else:
            return "", "not_supported", None

        return text, "completed", None

    except Exception as error:
        return "", "failed", str(error)
