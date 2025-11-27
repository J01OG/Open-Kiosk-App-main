# Open Kiosk App - Setup Guide

This guide provides step-by-step instructions to set up and run the Open Kiosk App in a new environment.

## 1. Prerequisites

Before starting, ensure you have the following installed on your machine:

* **Node.js & npm:** Download from [nodejs.org](https://nodejs.org/) (LTS version recommended).
* **Git:** (Optional) If you are cloning the repository.
* **Bun (Optional):** This project uses `bun.lockb`, so it was likely created with [Bun](https://bun.sh/). You can use `npm` if you prefer, but `bun` is faster.

## 2. Firebase Setup (Crucial)

This app requires a Firebase backend. You must set this up before the app will work.

1.  Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Register a Web App:**
    * Click the **Web** icon (`</>`).
    * Give it a nickname (e.g., "Kiosk App").
    * **Important:** Copy the `firebaseConfig` object displayed (apiKey, authDomain, projectId, etc.). You will need these later.
3.  **Enable Firestore Database:**
    * Go to **Build** > **Firestore Database**.
    * Click **Create Database**.
    * Start in **Test Mode** (for development) or **Production Mode** (requires configuring security rules).
4.  **Enable Authentication:**
    * Go to **Build** > **Authentication**.
    * Click **Get Started**.
    * Enable **Google** (required for Admin login) and **Anonymous** (optional).

## 3. Installation

1.  **Navigate to the project directory:**
    Open your terminal and move to the project folder:
    ```bash
    cd path/to/Open-Kiosk-App
    ```

2.  **Install Dependencies:**
    Run one of the following commands:

    **Using npm:**
    ```bash
    npm install
    ```

    **Using Bun:**
    ```bash
    bun install
    ```

## 4. Running the Application

1.  **Start the Development Server:**
    ```bash
    npm run dev
    # or
    bun dev
    ```

2.  **Open in Browser:**
    The terminal will show a local URL, usually `http://localhost:5173`. Open this link in your web browser.

## 5. In-App Configuration (First Time Setup)

The app uses an on-screen setup wizard instead of a `.env` file for initial configuration.

1.  **Initialization Screen:**
    When you load the app for the first time, you will see a **Store Initialization** screen.
2.  **Enter Store Details:**
    * **Store Name:** Enter your store's name.
    * **Currency:** Select your currency (e.g., INR).
3.  **Enter Firebase Config:**
    * Paste the **API Key**, **Project ID**, **Auth Domain**, etc., that you copied in Step 2.
4.  **Save:**
    Click **Save Settings**. The app will initialize and load the main shop interface.

## 6. Troubleshooting

* **"Firebase not initialized":** If you see this error immediately, clear your browser's **Local Storage** (F12 > Application > Local Storage) and refresh the page to restart the setup wizard.
* **Dependency Conflicts:** If `npm install` fails, try running:
    ```bash
    npm install --legacy-peer-deps
    ```
* **Port In Use:** If `localhost:5173` is taken, check your terminal for the new port (e.g., `5174`).