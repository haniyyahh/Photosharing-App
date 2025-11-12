# Project 2: Appserver and Database (React + Vite + Axios)

## Prerequisites
- Node.js LTS (>= 18)
- npm (>= 9)
- MongoDB running locally on 127.0.0.1

## What you will do
- Replace P1’s mock-backed app with a real backend and MongoDB
- Load data into MongoDB
- Use axios for all API calls
- Run client (Vite) and server (Express) together
- Verify with Mocha backend tests

## Directory layout
- `photoShare.jsx` React app entry (Vite)
- `components/` React components from P1
- `styles/` CSS
- `schema/` Mongoose models (`user.js`, `photo.js`, `schemaInfo.js`)
- `webServer.js` Express server using MongoDB
- `loadDatabase.js` Script to load demo data
- `test/` Mocha backend tests

## Migration from P1
1) Download P1 from elearning.
2) Copy the P2 starter code on top of it.
3) Do all steps and ensure everything works properly.

## Install
```bash
npm install
```
If you need to install test deps:
```bash
cd test && npm install && cd ..
```

## Load the database
1) Make sure MongoDB is running locally.
2) Load demo data:
```bash
node loadDatabase.js
```
This clears and reloads `User`, `Photo`, and a single `SchemaInfo` document.

## Verifying the Database in MongoDB
1) Open your Terminal or MongoDB Compass.
2) If using MongoDB Compass, create a new connection, save it, and connect.
3) Look for the `project2` database and verify that all required data is present.

## Run client + server together
```bash
npm run dev
```
- Client (Vite): http://localhost:3000
- Server (Express): http://localhost:3001

Individual scripts:
```bash
npm run server   # nodemon webServer.js (port 3001)
npm run client   # vite (port 3000)
```

## API endpoints
- `GET /test/info` → returns the single SchemaInfo document
- `GET /test/counts` → { user, photo, schemaInfo }
- `GET /user/list` → [{ _id, first_name, last_name }]
- `GET /user/:id` → user detail { _id, first_name, last_name, location, description, occupation }
- `GET /photosOfUser/:id` → user’s photos with comments

## Testing (backend)
From `P2_Starter_Code/test`:
```bash
npm install   # if not already
npm test
```
The tests target port 3001 and validate `/user/list`, `/user/:id`, `/photosOfUser/:id`.

## Linting
```bash
npm run lint
```
Fix issues:
```bash
npm run lint:fix
```

## Common issues
- Mongo not running → start MongoDB before `loadDatabase.js` and `npm run server`.
- Port conflicts → Vite uses 3000, server uses 3001. Adjust if needed.
- CORS not needed when using same origin via proxy/baseURL; we set axios baseURL to point at 3001.
