
import requests
import json
import io

BASE_URL = "http://127.0.0.1:5000"

# Login
login_response = requests.post(
    f"{BASE_URL}/api/auth/login",
    json={
        "email": "nausheen.test@example.com",
        "password": "DocuSphere@123"
    }
)

token = login_response.json()["access_token"]

headers = {
    "Authorization": f"Bearer {token}"
}


def test_upload(metadata, test_name):

    files = {
        "file": (
            "metadata_test.txt",
            io.BytesIO(b"Testing dynamic metadata validation"),
            "text/plain"
        )
    }

    data = {
        "metadata": json.dumps(metadata)
    }

    response = requests.post(
        f"{BASE_URL}/api/documents/upload",
        headers=headers,
        files=files,
        data=data
    )

    print(f"\n{test_name}")
    print("HTTP Status:", response.status_code)
    print("Response:", response.json())


# Test 1: Invalid dropdown option
test_upload(
    {"report_type": "Invalid Report"},
    "TEST 1 - Invalid dropdown value"
)

# Test 2: Missing required field
test_upload(
    {},
    "TEST 2 - Missing required field"
)

# Test 3: Valid dropdown option
test_upload(
    {"report_type": "Test Report"},
    "TEST 3 - Valid metadata"
)
