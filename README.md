# Project 3: State, Sessions and Input (React + Vite + Axios + TanStack Query + Zustand)

## Prerequisites
- Node.js LTS (>= 18)
- npm (>= 9)
- MongoDB running locally on 127.0.0.1

## What you will do
- Refactor data fetching to use TanStack Query
- Manage shared state with Zustand
- Add user login/logout functionality
- Add comment functionality
- Add photo upload functionality
- Add user registration with passwords

## Install
```bash
npm install
npm i @tanstack/react-query
npm i zustand
npm install express-session
npm install multer
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
This clears and reloads `User`, `Photo`, and a single `SchemaInfo` document into the `project3` database.

**Note:** Make sure your `webServer.js` connects to `mongodb://127.0.0.1/project3`.

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
- `POST /admin/login` → login user (requires login_name, password)
- `POST /admin/logout` → logout user
- `GET /user/list` → [{ _id, first_name, last_name }] (requires auth)
- `GET /user/:id` → user detail { _id, first_name, last_name, location, description, occupation } (requires auth)
- `GET /photosOfUser/:id` → user's photos with comments (requires auth)
- `POST /commentsOfPhoto/:photo_id` → add comment to photo (requires auth, body: { comment })
- `POST /photos/new` → upload photo (requires auth, multipart form data)
- `POST /user` → register new user (body: { login_name, password, first_name, last_name, location, description, occupation })

## Testing (backend)
From `test` directory:
```bash
npm install   # if not already
npm test
```

**Important:** Run `loadDatabase.js` before running tests, as tests assume the database has only the objects from `loadDatabase.js`.

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
- Database name → make sure `webServer.js` connects to `project3` database (not `project2`).
- Session cookies → tests require proper session cookie handling with express-session.
- File uploads → ensure `images` directory exists for photo uploads.
