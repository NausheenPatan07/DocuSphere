
import requests

BASE_URL = "http://127.0.0.1:5000"

# Existing test accounts
FINANCE_EMAIL = "finance.test@example.com"
FINANCE_PASSWORD = "Finance@123"

ADMIN_EMAIL = "nausheen.test@example.com"
ADMIN_PASSWORD = "DocuSphere@123"

# Existing Engineering document
DOCUMENT_ID = "6afa061b115b29cd91cb3cf3"


def login(email, password):

    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": email,
            "password": password
        }
    )

    response.raise_for_status()

    return response.json()["access_token"]


def show_result(title, response):

    print(f"\n{title}")
    print("HTTP Status:", response.status_code)

    try:
        print("Response:", response.json())
    except ValueError:
        print("Response: File download or non-JSON response")


# 1. Login both users
finance_token = login(FINANCE_EMAIL, FINANCE_PASSWORD)
admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

finance_headers = {
    "Authorization": f"Bearer {finance_token}"
}

admin_headers = {
    "Authorization": f"Bearer {admin_token}"
}

print("Both users logged in successfully.")


# 2. Finance tries downloading before approval
response = requests.get(
    f"{BASE_URL}/api/documents/{DOCUMENT_ID}/download",
    headers=finance_headers
)

show_result("TEST 1 - Download before approval", response)

if response.status_code != 403:
    raise AssertionError("Expected HTTP 403 before approval")


# 3. Finance submits access request
response = requests.post(
    f"{BASE_URL}/api/access/request",
    headers=finance_headers,
    json={
        "document_id": DOCUMENT_ID,
        "reason": "Required for cross-division project work."
    }
)

show_result("TEST 2 - Submit access request", response)

if response.status_code != 201:
    raise AssertionError("Access request creation failed")

request_id = response.json()["request_id"]


# 4. Admin checks approval inbox
response = requests.get(
    f"{BASE_URL}/api/access/inbox",
    headers=admin_headers
)

show_result("TEST 3 - Admin approval inbox", response)

if response.status_code != 200:
    raise AssertionError("Admin inbox failed")

if not any(
    item["id"] == request_id
    for item in response.json()["requests"]
):
    raise AssertionError("New request was not found in admin inbox")


# 5. Admin approves request
response = requests.post(
    f"{BASE_URL}/api/access/approve",
    headers=admin_headers,
    json={
        "request_id": request_id,
        "decision": "approved"
    }
)

show_result("TEST 4 - Admin approves request", response)

if response.status_code != 200:
    raise AssertionError("Approval failed")


# 6. Finance checks own request status
response = requests.get(
    f"{BASE_URL}/api/access/my-requests",
    headers=finance_headers
)

show_result("TEST 5 - Finance checks request status", response)

if response.status_code != 200:
    raise AssertionError("My requests endpoint failed")


# 7. Finance downloads after approval
response = requests.get(
    f"{BASE_URL}/api/documents/{DOCUMENT_ID}/download",
    headers=finance_headers
)

show_result("TEST 6 - Download after approval", response)

if response.status_code != 200:
    raise AssertionError("Download after approval failed")

print("\nALL ACCESS WORKFLOW TESTS PASSED")
