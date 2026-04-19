"""
Appwrite Sync Module
Handles all Appwrite Cloud Database and Storage operations for Resolvo.
Uses TablesDB (Appwrite SDK v18+) for database operations.

Existing collection schema:
  complaint_id (string), text (string), category (string),
  priority (string), sentiment (float), resolution_time (int),
  image_url (string|null)
"""

import os
import base64
from dotenv import load_dotenv

load_dotenv()

from appwrite.client import Client
from appwrite.services.tables_db import TablesDB
from appwrite.services.storage import Storage
from appwrite.id import ID
from appwrite.query import Query
from appwrite.permission import Permission
from appwrite.role import Role
from appwrite.input_file import InputFile

APPWRITE_ENDPOINT = os.getenv('APPWRITE_ENDPOINT', 'https://sgp.cloud.appwrite.io/v1')
APPWRITE_PROJECT_ID = os.getenv('APPWRITE_PROJECT_ID', '69e34dd9002fef599d7d')
APPWRITE_API_KEY = os.getenv('APPWRITE_API_KEY', '')
APPWRITE_DB_ID = os.getenv('APPWRITE_DB_ID', '69e358ca00268f874126')
APPWRITE_COL_ID = os.getenv('APPWRITE_COL_ID', '69e358cd00179dcf5bb7')
APPWRITE_BUCKET_ID = os.getenv('APPWRITE_BUCKET_ID', 'resolvo_images')

client = Client()
client.set_endpoint(APPWRITE_ENDPOINT)
client.set_project(APPWRITE_PROJECT_ID)
client.set_key(APPWRITE_API_KEY)

tables_db = TablesDB(client)
storage = Storage(client)


# ─── Storage Operations ──────────────────────────────────────────────────────

def ensure_bucket_exists():
    """Create the storage bucket if it doesn't exist."""
    try:
        storage.get_bucket(APPWRITE_BUCKET_ID)
        return True
    except Exception:
        try:
            storage.create_bucket(
                bucket_id=APPWRITE_BUCKET_ID,
                name='Resolvo Images',
                permissions=[
                    Permission.read(Role.any()),
                    Permission.create(Role.any()),
                    Permission.update(Role.any()),
                    Permission.delete(Role.any()),
                ],
                file_security=False,
                maximum_file_size=10485760,
            )
            return True
        except Exception as e:
            print(f"[Appwrite] Bucket creation failed: {e}")
            return False


def upload_image(image_base64, filename='complaint_image.jpg'):
    """Upload a base64-encoded image to Appwrite Storage. Returns file URL or None."""
    try:
        if not image_base64:
            return None
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]

        image_bytes = base64.b64decode(image_base64)
        file_id = ID.unique()

        result = storage.create_file(
            bucket_id=APPWRITE_BUCKET_ID,
            file_id=file_id,
            file=InputFile.from_bytes(image_bytes, filename),
            permissions=[Permission.read(Role.any())]
        )
        fid = result['$id'] if isinstance(result, dict) else result.id
        url = f"{APPWRITE_ENDPOINT}/storage/buckets/{APPWRITE_BUCKET_ID}/files/{fid}/view?project={APPWRITE_PROJECT_ID}"
        print(f"[Appwrite] Uploaded image -> {fid}")
        return url
    except Exception as e:
        print(f"[Appwrite] Image upload failed: {e}")
        return None


# ─── Database Operations ─────────────────────────────────────────────────────

def sync_complaint_to_appwrite(complaint_dict, image_base64=None):
    """
    Sync a complaint to Appwrite cloud DB.
    Maps from app complaint format to Appwrite collection schema:
      complaint_id, text, category, priority, sentiment, resolution_time, image_url
    """
    try:
        image_url = None
        if image_base64:
            image_url = upload_image(image_base64)

        # Map to the existing Appwrite collection schema
        row_data = {
            'complaint_id': str(complaint_dict.get('id', ''))[:20],
            'text': str(complaint_dict.get('description') or complaint_dict.get('title', ''))[:2000],
            'category': str(complaint_dict.get('category', 'Product'))[:50],
            'priority': str(complaint_dict.get('priority', 'Low'))[:20],
            'sentiment': float(
                complaint_dict.get('sentiment', {}).get('score', 0)
                if isinstance(complaint_dict.get('sentiment'), dict)
                else complaint_dict.get('sentiment_score', 0)
            ),
            'resolution_time': int(complaint_dict.get('resolutionTime') or complaint_dict.get('resolution_time') or 0),
            'status': str(complaint_dict.get('status', 'Open'))[:20],
            'image_url': image_url,
        }

        result = tables_db.create_row(
            database_id=APPWRITE_DB_ID,
            table_id=APPWRITE_COL_ID,
            row_id=ID.unique(),
            data=row_data,
            permissions=[
                Permission.read(Role.any()),
                Permission.update(Role.any()),
                Permission.delete(Role.any()),
            ]
        )
        row_id = result.id if hasattr(result, 'id') else result['$id']
        print(f"[Appwrite] Synced {complaint_dict.get('id')} -> {row_id}")
        return row_id
    except Exception as e:
        print(f"[Appwrite] Sync failed for {complaint_dict.get('id')}: {e}")
        return None


def fetch_complaints_from_appwrite(limit=100):
    """Fetch complaint rows from Appwrite. Returns list of dicts."""
    try:
        result = tables_db.list_rows(
            database_id=APPWRITE_DB_ID,
            table_id=APPWRITE_COL_ID,
            queries=[
                Query.limit(limit),
                Query.order_desc('$createdAt'),
            ]
        )
        docs = []
        for row in result.rows:
            d = row.to_dict()
            data = d.get('data', {})
            data['$id'] = d.get('$id', '')
            data['$createdAt'] = d.get('$createdAt', '')
            docs.append(data)
        print(f"[Appwrite] Fetched {len(docs)} rows.")
        return docs
    except Exception as e:
        print(f"[Appwrite] Fetch failed: {e}")
        return []


def delete_complaint_from_appwrite(row_id):
    """Delete a complaint row from Appwrite."""
    try:
        tables_db.delete_row(
            database_id=APPWRITE_DB_ID,
            table_id=APPWRITE_COL_ID,
            row_id=row_id,
        )
        return True
    except Exception as e:
        print(f"[Appwrite] Delete failed: {e}")
        return False


def update_complaint_status_appwrite(complaint_id, status, resolution_time=None):
    """Update status (and resolution time) of a complaint in Appwrite."""
    try:
        result = tables_db.list_rows(
            database_id=APPWRITE_DB_ID,
            table_id=APPWRITE_COL_ID,
            queries=[Query.equal('complaint_id', str(complaint_id))]
        )
        for row in result.rows:
            d = row.to_dict()
            row_id = d.get('$id')
            if not row_id: continue
            
            data = {'status': str(status)[:20]}
            if resolution_time is not None:
                data['resolution_time'] = int(resolution_time)
                
            tables_db.update_row(
                database_id=APPWRITE_DB_ID,
                table_id=APPWRITE_COL_ID,
                row_id=row_id,
                data=data
            )
            print(f"[Appwrite] Synced status for {complaint_id} -> {status}")
            return True
    except Exception as e:
        print(f"[Appwrite] Status update failed for {complaint_id}: {e}")
    return False


def test_connection():
    """Quick connectivity test."""
    try:
        result = tables_db.list_rows(
            database_id=APPWRITE_DB_ID,
            table_id=APPWRITE_COL_ID,
            queries=[Query.limit(1)]
        )
        return True, f"Connected! {int(result.total)} total rows."
    except Exception as e:
        return False, str(e)


def sync_all_complaints(complaints_list):
    """Bulk-sync a list of complaint dicts to Appwrite."""
    success = 0
    failed = 0
    for c in complaints_list:
        result = sync_complaint_to_appwrite(c)
        if result:
            success += 1
        else:
            failed += 1
    return success, failed
