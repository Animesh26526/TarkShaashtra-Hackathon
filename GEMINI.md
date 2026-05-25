# Resolvo - AI-Powered Complaint Classification & Resolution System

## Project Overview
Resolvo is a production-grade intelligent system designed to automate customer support operations. It features a hybrid processing engine that combines rule-based keyword analysis with Google Gemini AI for high-accuracy complaint classification and resolution.

### Core Technologies
- **Backend:** Python 3.10+, Flask, SQLAlchemy (SQLite), Google Gemini GenAI, Appwrite.
- **Frontend:** React 18, Vite, Tailwind CSS, Framer Motion.
- **Data Integrity:** Dual-persistence layer (SQLite local + Appwrite cloud sync) with automatic merging for offline/unsynced resilience.

## Building and Running

### Prerequisites
- Python 3.10+
- Node.js & npm
- [uv](https://github.com/astral-sh/uv) (recommended for backend dependency management)

### Backend Setup
1. Navigate to `final_project/backend`.
2. Install dependencies: `uv sync` (or `pip install .`).
3. Create a `.env` file with the following:
   - `GEMINI_API_KEY`: Google AI key.
   - `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`: Appwrite cloud credentials.
   - `APPWRITE_DB_ID`, `APPWRITE_COL_ID`: Cloud database configuration.
4. Run: `python app.py`.

### Frontend Setup
1. Navigate to `final_project/frontend`.
2. Install: `npm install`.
3. Create a `.env` file:
   - `VITE_APPWRITE_ENDPOINT`, `VITE_APPWRITE_PROJECT_ID`.
   - `VITE_API_URL=http://localhost:5000`.
4. Run: `npm run dev`.

## Key Architectural Fixes & Security
- **Secure Persistence**: Removed all hardcoded secrets; credentials must be provided via environment variables.
- **Data Resilience**: Backend now merges unsynced local complaints with cloud data, ensuring no loss of visible information during sync failures.
- **Tighter Security**: Appwrite permissions are restricted to authenticated `Role.users()` to prevent unauthorized data access.
- **Robust Frontend**: Enhanced error handling in `AppContext` and defensive initialization in `AuthContext` to prevent UI crashes.
- **Modern Backend**: Eliminated deprecated `datetime.utcnow()` calls and standardized on timezone-aware UTC objects.
- **Reliable Sync**: Bulk-sync operations now correctly track and update local synchronization flags.
