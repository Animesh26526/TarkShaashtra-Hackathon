import os
import sys
import subprocess
import webbrowser
import time

def main():
    print("\n==========================================")
    print(" RESOLVO - AI Complaint Resolution Engine")
    print("==========================================\n")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    frontend_dir = os.path.join(base_dir, "frontend")
    
    print("[1/3] Starting Flask Backend on port 5000...")
    # Using shell=True so it works seamlessly on Windows
    backend_process = subprocess.Popen(
        [sys.executable, "app.py"],
        cwd=backend_dir,
        shell=True
    )
    
    time.sleep(3)
    
    node_modules_path = os.path.join(frontend_dir, "node_modules")
    if not os.path.exists(node_modules_path):
        print("Installing frontend dependencies...")
        subprocess.run(["npm", "install"], cwd=frontend_dir, shell=True)
        
    print("[2/3] Starting Vite Frontend on port 5173...")
    frontend_process = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=frontend_dir,
        shell=True
    )
    
    print("[3/3] Waiting for frontend to initialize...")
    time.sleep(4)
    
    print("[*] Opening browser to http://localhost:5173 ...")
    webbrowser.open("http://localhost:5173")
    
    print("\n Backend:  http://localhost:5000")
    print(" Frontend: http://localhost:5173\n")
    print(" Servers are running locally. Keep this terminal open.")
    print(" Press Ctrl+C in this terminal to safely shut down the application.\n")
    
    try:
        # Keep the python script alive so the terminals stay linked
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\nShutting down Resolvo servers...")
        try:
            backend_process.terminate()
            frontend_process.terminate()
        except:
            pass
        print("Goodbye!")

if __name__ == "__main__":
    main()
