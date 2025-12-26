# InstaChat AI Backend

This is the Node.js backend for the InstaChat AI application, providing authentication, database persistence, and real-time messaging capabilities.

## Architecture Overview

1.  **Backend:** Node.js + Express.
    *   Handles REST API requests for Auth (Login/Register), User Search, and Chat History.
    *   Hosts the **Socket.IO** server for real-time bidirectional communication.
2.  **Database:** SQLite.
    *   Stores Users, Chats, and Messages in a local file (`instachat.sqlite`).
    *   **No separate database installation required.**
3.  **Frontend:** React (communicates via Axios for REST and Socket.io-client for real-time).

## Prerequisites
- **Node.js** (v14 or higher)

## Installation & Setup

### 1. Backend Server
Open a terminal, navigate to the `backend` folder, and start the server:

```bash
cd backend
npm install
npm run dev
```
*Expected Output:*
```
🚀 Server running on port 5000
✅ SQLite Connected & Tables Initialized
```
*Leave this terminal window open.*

### 2. Frontend Application
Open a new terminal in the project root (parent of `backend`), and start the React application:

```bash
npm install
npm start 
# OR 'npm run dev' depending on your build tool
```

## How to Test Real-Time Chat

1.  Open **Browser Tab A**. Register a user (e.g., "UserOne").
2.  Open **Browser Tab B** (Incognito). Register a second user (e.g., "UserTwo").
3.  In Tab A, click the **New Message** icon (Pen/Paper).
4.  Search for "UserTwo". Click the result to start a chat.
5.  Send a message. It should appear instantly in Tab B.

## Troubleshooting

-   **"Unable to connect to server"**: Ensure the backend terminal shows `🚀 Server running on port 5000`. 
-   **"Authentication Failed"**: Ensure `backend/server.js` is running and you are not using old tokens from the previous MongoDB version (Clear Local Storage if necessary).
-   **Database Errors**: If you encounter SQL errors, try deleting the `backend/instachat.sqlite` file and restarting the server to regenerate the tables.

## API Endpoints

- **POST /api/auth/register**: Register new user
- **POST /api/auth/login**: Login user
- **GET /api/chat**: Get user's chats
- **POST /api/chat/direct**: Start a new chat
- **GET /api/chat/:chatId/messages**: Get chat history
- **POST /api/chat/:chatId/messages**: Send a message
- **GET /api/users/search?q=...**: Search for users
