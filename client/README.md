# FLEXI --- Student Project Collaboration Studio

FLEXI is a full-stack web application for college students to publish
project ideas, discover projects, find teammates, and collaborate on
project work.

## Features

-   User registration, login, logout, and session handling
-   Public project discovery and browsing
-   Search, filtering, and project details
-   Student profiles and project ownership
-   Project creation and management
-   Collaboration workflows for project teams
-   Tasks and milestones for organizing work
-   Responsive React interface
-   Express API with MongoDB/Mongoose
-   Security protections such as password hashing, cookie-based
    authentication, request validation, and rate limiting

> Features may depend on the current project phase and the code included
> in the version you received.

## Technology Stack

**Frontend** - React - Vite - JavaScript - React Router

**Backend** - Node.js - Express - Mongoose

**Database** - MongoDB

## Project Structure

The application is organized into two main folders:

``` text
FLEXI/
├── client/    # React + Vite frontend
└── server/    # Express API and database models
```

Do not add `node_modules`, real `.env` files, passwords, JWT secrets, or
database credentials to a shared ZIP or public repository.

## Requirements

Install the following before running FLEXI:

-   Node.js (use a version supported by the project's `package.json`;
    Node.js 20.19+ is a suitable baseline for the current setup)
-   npm
-   MongoDB Community Server running locally, or access to a configured
    MongoDB deployment

## Setup

### 1. Get the project

Extract the ZIP file, then open a terminal in the extracted `FLEXI`
folder.

### 2. Configure the backend environment

Go to the backend folder:

``` bash
cd server
```

Install dependencies:

``` bash
npm install
```

Copy the example environment file to a local environment file.

On macOS/Linux:

``` bash
cp .env.example .env
```

On Windows PowerShell:

``` powershell
Copy-Item .env.example .env
```

Open `server/.env` and check the variable names in
`server/.env.example`. Configure the values required by the project. For
a local MongoDB installation, the connection commonly looks like:

``` env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=flexi_dev
```

Use a new, strong, private JWT secret in the environment variable
expected by the backend. Check `server/.env.example` for the exact
variable names and any additional required settings. Do not share your
`.env` file.

Make sure MongoDB is running before starting the API.

### 3. Start the backend

From the `server` folder, use the development script defined in
`server/package.json`. In the current setup, this is expected to be:

``` bash
npm run dev
```

Keep this terminal open. The backend API uses port **5050** in the
current local setup. Check the startup output and environment
configuration if your version uses a different port.

### 4. Start the frontend

Open a second terminal in the project root:

``` bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite in the terminal. In the current
setup, the frontend preview has used `http://127.0.0.1:4173`; Vite may
print a different URL if the configuration or port has changed.

The Vite development proxy is configured to forward API requests to the
backend on port `5050`. If you change the backend port, update the
frontend proxy configuration to match.

## Verify the application

After both services start:

1.  Open the frontend URL printed by Vite.
2.  Register a test account.
3.  Log in and refresh the page to check that the session is retained.
4.  Create a test project.
5.  Confirm that the project appears in project discovery.
6.  Log out and verify that protected pages require authentication.

The API health endpoint is available at:

``` text
http://127.0.0.1:5050/api/health
```

If that endpoint does not respond, confirm that the backend is running
and check the terminal for configuration or database errors.

## Database and data

The application code and the MongoDB database are separate.

-   A fresh local database starts without your existing users or
    projects.
-   To transfer existing records, create a MongoDB backup and restore it
    into the recipient's database, or configure both installations to
    use an appropriately secured hosted database.
-   Do not put private database credentials in this README or in a
    public repository.
-   A MongoDB GUI such as MongoDB Compass can help inspect a database,
    but Compass does not replace the MongoDB server.

## Common problems

### Frontend loads, but API requests fail

-   Make sure the backend is running.
-   Check the backend terminal for startup errors.
-   Confirm the frontend proxy points to the backend's actual port
    (currently `5050`).
-   Confirm the backend's allowed frontend origin is configured
    correctly.

### Database connection error

-   Confirm MongoDB Community Server is installed and running, or check
    your hosted database connection.
-   Verify `MONGODB_URI` and `MONGODB_DB_NAME` in `server/.env`.
-   Never commit database passwords or private connection strings.

### Environment variable or JWT error

-   Confirm that `server/.env` exists and contains all required values
    from `server/.env.example`.
-   Generate your own private JWT secret; do not reuse another person's
    secret.

### Port already in use

Stop the application using that port or configure an available port and
update any dependent proxy/origin settings.

## Security Notes

-   Keep `.env` files private and out of Git.
-   Use a unique JWT secret for each environment.
-   Do not use real personal information when testing.
-   Use test accounts and test data for demonstrations.
-   Never publish database credentials, session tokens, or private keys.

## Development Notes

-   Install frontend dependencies from `client/`.
-   Install backend dependencies from `server/`.
-   Review each folder's `package.json` for available scripts.
-   Keep generated dependencies such as `node_modules/` out of the ZIP.
-   The project should retain the two application folders, `client/` and
    `server/`.

## License

No license is specified in this README. Add a license file if you intend
to distribute the project under a particular open-source license.
