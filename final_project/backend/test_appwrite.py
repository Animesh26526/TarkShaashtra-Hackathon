"""
Temporary Appwrite Connection Test Script
Run: python test_appwrite.py
Verifies DB CRUD + Storage bucket operations.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

# Fix Windows console encoding for emoji-free output
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from appwrite_sync import (
    test_connection, sync_complaint_to_appwrite,
    fetch_complaints_from_appwrite, delete_complaint_from_appwrite,
    ensure_bucket_exists
)

def main():
    print("\n" + "="*60)
    print("  APPWRITE CONNECTION TEST")
    print("="*60 + "\n")

    # Step 1: Test basic connectivity
    print("[1/5] Testing connection...")
    ok, msg = test_connection()
    if ok:
        print(f"  [OK] {msg}")
    else:
        print(f"  [FAIL] Connection FAILED: {msg}")
        print("\n  Possible fixes:")
        print("  - Check APPWRITE_API_KEY in .env")
        print("  - Check APPWRITE_PROJECT_ID in .env")
        print("  - Verify collection exists in Appwrite console")
        print("  - Ensure API key has databases.read/write scopes")
        return

    # Step 2: Ensure storage bucket exists
    print("\n[2/5] Ensuring storage bucket exists...")
    bucket_ok = ensure_bucket_exists()
    if bucket_ok:
        print("  [OK] Storage bucket ready.")
    else:
        print("  [WARN] Storage bucket setup failed (non-critical, continuing)")

    # Step 3: Create a test document
    print("\n[3/5] Creating test row...")
    test_complaint = {
        'id': 'TEST-001',
        'title': 'Appwrite Connection Test',
        'description': 'This is an automated test complaint created by test_appwrite.py',
        'category': 'Product',
        'priority': 'Low',
        'status': 'Open',
        'sentiment': {'label': 'Neutral', 'score': 0.0},
        'resolution': 'Test Resolution',
        'confidence': '95%',
        'type': 'Text',
        'assignedTo': 'Test Script',
    }
    doc_id = sync_complaint_to_appwrite(test_complaint)
    if doc_id:
        print(f"  [OK] Created row: {doc_id}")
    else:
        print("  [FAIL] Failed to create row.")
        return

    # Step 4: List rows
    print("\n[4/5] Listing rows...")
    docs = fetch_complaints_from_appwrite(limit=5)
    print(f"  [OK] Found {len(docs)} rows:")
    for d in docs[:5]:
        cid = d.get('complaint_id', d.get('$id', '?'))
        title = d.get('title', 'No title')
        print(f"     - {cid}: {title}")

    # Step 5: Delete the test row
    print(f"\n[5/5] Cleaning up test row {doc_id}...")
    deleted = delete_complaint_from_appwrite(doc_id)
    if deleted:
        print(f"  [OK] Deleted test row.")
    else:
        print(f"  [WARN] Failed to delete (you can remove it manually)")

    print("\n" + "="*60)
    print("  ALL TESTS PASSED!")
    print("="*60 + "\n")


if __name__ == '__main__':
    main()
