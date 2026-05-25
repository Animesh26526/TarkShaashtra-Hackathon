import os
import re
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.query import Query
from dotenv import load_dotenv

load_dotenv()

# Appwrite Config
ENDPOINT = os.getenv('APPWRITE_ENDPOINT', 'https://sgp.cloud.appwrite.io/v1')
PROJECT_ID = os.getenv('APPWRITE_PROJECT_ID', '69e34dd9002fef599d7d')
API_KEY = os.getenv('APPWRITE_API_KEY', '') # Assuming this is available in env
DB_ID = os.getenv('APPWRITE_DB_ID', '69e358ca00268f874126')
COL_ID = os.getenv('APPWRITE_COL_ID', '69e358cd00179dcf5bb7')

if not API_KEY:
    print("Error: APPWRITE_API_KEY not found in .env")
    exit(1)

client = Client()
client.set_endpoint(ENDPOINT)
client.set_project(PROJECT_ID)
client.set_key(API_KEY)

databases = Databases(client)

def purge_bad_ids():
    print("Starting data purge...")
    try:
        # Fetch records
        result = databases.list_documents(
            database_id=DB_ID,
            collection_id=COL_ID,
            queries=[Query.limit(100)] # Process in batches if needed, but here we just want to clear the mess
        )
        
        count = 0
        pattern = re.compile(r'^CMP-\d{4}$')
        
        for doc in result['documents']:
            cid = doc.get('complaint_id', '')
            if not pattern.match(str(cid)):
                print(f"Deleting non-standard ID: {cid} (Doc: {doc['$id']})")
                databases.delete_document(
                    database_id=DB_ID,
                    collection_id=COL_ID,
                    document_id=doc['$id']
                )
                count += 1
        
        print(f"Purge complete. Removed {count} documents.")
    except Exception as e:
        print(f"Error during purge: {e}")

if __name__ == "__main__":
    purge_bad_ids()
