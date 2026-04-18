# 📌 AI-Powered Complaint Classification & Resolution System
## 🚀 Overview
An end-to-end intelligent system that automates **complaint classification, priority detection, and resolution recommendation** to streamline customer support operations and improve response efficiency.

Developed for **Dev IT Limited Hackathon – Problem Statement 14**.
## 🚀 Problem Context
In the wellness and service industry, customer complaints arrive from multiple channels such as emails, calls, and direct communication. These complaints are typically:

- Manually reviewed and categorized  
- Inconsistently tagged  
- Not prioritized effectively  
- Lacking actionable resolution guidance  

### This results in:
- Increased response time  
- Missed SLAs (Service Level Agreements)  
- Reduced customer satisfaction
  
## 💡 Solution
This project introduces an automated system that:

- Classifies complaints intelligently  
- Assigns priority dynamically  
- Recommends actionable resolution steps  
- Processes complaints in real time
  
## 🧠 Key Features
### 🔹 Complaint Input System
- Web-based interface for submitting complaints  
- Supports structured text input  
### 🔹 Automatic Complaint Classification
Categorizes complaints into:
- Product Issues  
- Packaging Issues  
- Trade/Service Issues  

Based on keyword analysis and backend logic  
### 🔹 Dynamic Priority Tagging
Automatically assigns:
- High Priority  
- Medium Priority  
- Low Priority  

Based on urgency and context of complaint  
### 🔹 Resolution Recommendation Engine
Suggests specific actions:
- Product replacement  
- Escalation  
- Follow-up communication  
### 🔹 Data Processing
- Uses CSV dataset: `TS-PS14.csv`  
- Supports data-driven classification and testing  
### 🔹 Integrated Frontend & Backend
- User interface connected with Flask backend  
- Real-time response display  
### 🔹 Additional UI Modules
- Login portal (prototype)  
- Registration portal (prototype)
  
## 🏗️ System Architecture
User Input (Web UI)
        ↓
Frontend (HTML/CSS/JS)
        ↓
Flask Backend (app.py)
        ↓
Processing Layer (models.py)
        ├── Classification Logic
        ├── Priority Engine
        └── Recommendation Engine
        ↓
Dataset (CSV)
        ↓
Response Output (UI)

## 🛠️ Tech Stack
### 🔹 Backend
- Python  
- Flask  
### 🔹 Frontend
- HTML  
- CSS  
- JavaScript  
### 🔹 Data & Configuration
- CSV dataset  
- Environment variables (`.env`)  
### 🔹 Supporting Files
- Node configuration (`package.json`)  
- Utility scripts (`check_count.js`)
  
## 📂 Project Structure
/project-root

├── app.py                      # Main Flask application
├── models.py                   # Core processing logic
├── TS-PS14.csv                 # Complaint dataset
├── requirements.txt            # Python dependencies
├── package.json                # Node dependencies
├── .env                        # Environment variables

├── /templates
│   └── index.html              # Main UI

├── /static
│   ├── style.css               # Styling
│   ├── app.js                  # Frontend interaction
│   ├── upload.js               # File upload logic
│   └── check_count.js          # Utility script

├── /login_portal               # Login UI prototype
│   └── *.html

├── /Registration_portal        # Registration UI prototype
│   └── *.html

## 🔄 Application Workflow
1. User submits complaint through UI  
2. Frontend sends request to backend  
3. Backend processes complaint using `models.py`  
4. System performs:
   - Classification  
   - Priority assignment  
   - Resolution suggestion  
5. Processed result is returned to frontend  
6. Output is displayed to user
   
## 📊 Example Output
| Complaint                          | Category   | Priority | Recommendation |
|-----------------------------------|-----------|----------|----------------|
| Product damaged during delivery   | Product   | High     | Replace item   |
| Packaging was torn                | Packaging | High     | Escalate       |
| Delivery was delayed              | Trade     | Medium   | Follow-up      |

## ⚙️ Setup & Execution
### 1. Clone Repository
git clone <repository-url>  
cd project-root  
### 2. Install Dependencies
pip install -r requirements.txt  
### 3. Configure Environment
Create a `.env` file if required.
### 4. Run Application
python app.py  
### 5. Access Application
http://127.0.0.1:5000  

## 📈 Current Implementation Status
### ✅ Completed
- Functional Flask backend  
- Integrated frontend UI  
- Complaint classification logic  
- Priority tagging system  
- Resolution recommendation logic  
- Dataset integration  
### ⚠️ Partial / Prototype
- Authentication system (not integrated)  
- Dashboard visualization (basic)  
- AI/ML model (rule-based approach currently)  
## 🔮 Future Enhancements
- Integration of advanced NLP models (BERT, TF-IDF, etc.)  
- Real-time analytics dashboard with charts  
- SLA tracking and alerts  
- Full authentication system  
- API integration for multi-channel complaint input  
- Deployment on cloud platforms  
- Automated reporting (PDF/CSV export)
  
## 🎯 Use Cases
### 👤 Customer Support Executive
- Submit and process complaints  
- Follow recommended resolution steps  
- Update complaint status  
### 🧪 Quality Assurance Team
- Analyze complaint patterns  
- Ensure classification accuracy  
- Identify recurring issues  
### 📊 Operations Manager
- Monitor complaint distribution  
- Track priority levels  
- Evaluate response efficiency
  
## 👨‍💻 Contributors
- Animesh Bhavsar  
- Krish Modi  
- Rutvi Solanki  
- Yash Ganatra
  
## 📜 License
This project is developed for **academic and hackathon purposes** and is intended for demonstration and learning use.
