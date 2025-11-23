/**
 * Project 3 Express server connected to MongoDB 'project3'.
 * Start with: node webServer.js
 * Client uses axios to call these endpoints.
 */

import mongoose from "mongoose";
import bluebird from "bluebird";
import express from "express";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import session from 'express-session';
import path from "path";

import User from "./schema/user.js";
import Photo from "./schema/photo.js";
import SchemaInfo from "./schema/schemaInfo.js";

const portno = 3001;
const app = express();

app.use(express.json());

app.use(session({
  secret: 'SECRETKEY',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

const allowedOrigin = 'http://localhost:3000';
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// --- AUTHENTICATION MIDDLEWARE ---
app.use((req, res, next) => {
  const openRoutes = ['/admin/login', '/admin/logout', '/user'];
  if (openRoutes.includes(req.path)) return next();
  if (!req.session.user) return res.status(401).send({ error: 'Unauthorized: Please login' });
  next();
});

// --- LOGIN endpoint ---
app.post('/admin/login', async (req, res) => {
  try {
    const { login_name, password } = req.body;
    if (!login_name || !password) return res.status(400).send({ error: 'login_name and password required' });

    const user = await User.findOne({ login_name }).lean();
    if (!user || user.password !== password) return res.status(400).send({ error: 'Invalid login_name or password' });

    req.session.user = { _id: user._id.toString(), first_name: user.first_name };
    return res.status(200).send({ _id: user._id.toString(), first_name: user.first_name });
  } catch (err) {
    console.error('Error in /admin/login:', err);
    return res.status(500).send({ error: 'Internal server error' });
  }
});

// --- LOGOUT endpoint ---
app.post('/admin/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send({ error: "Logout failed" });
    }
    res.status(200).send({ success: true });
  });
});

// --- CREATE USER ---
app.post('/user', async (req, res) => {
  try {
    const { login_name, password, first_name, last_name, location, description, occupation } = req.body;
    if (!login_name || !password || !first_name || !last_name) {
      return res.status(400).send({ error: "Required fields: login_name, password, first_name, last_name" });
    }

    const existing = await User.findOne({ login_name }).lean();
    if (existing) return res.status(400).send({ error: "login_name already exists" });

    const newUser = new User({
      login_name,
      password,
      first_name,
      last_name,
      location: location || "",
      description: description || "",
      occupation: occupation || ""
    });
    await newUser.save();

    return res.status(200).send({ login_name: newUser.login_name, user_id: newUser._id.toString() });
  } catch (err) {
    console.error("Error in POST /user:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// /user/list
app.get('/user/list', async (req, res) => {
  try {
    const users = await User.find({}, '_id first_name last_name').lean();
    res.status(200).send(users);
  } catch (err) {
    console.error('Error in /user/list:', err);
    res.status(500).send({ error: 'Internal server error' });
  }
});

// /user/:id
app.get('/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send({ error: 'Invalid user id format' });

    const user = await User.findById(userId, '_id first_name last_name location description occupation').lean();
    if (!user) return res.status(404).send({ error: 'User not found' });

    res.status(200).send(user);
  } catch (err) {
    console.error('Error in /user/:id:', err);
    res.status(500).send({ error: 'Internal server error' });
  }
});

// /photosOfUser/:id
app.get('/photosOfUser/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send({ error: 'Invalid user id format' });

    const photos = await Photo.find({ user_id: userId }).select('-__v').lean();
    if (!photos || photos.length === 0) return res.status(404).send({ error: 'Photos not found' });

    const commentUserIds = [];
    photos.forEach(photo => {
      if (photo.comments && photo.comments.length > 0) {
        photo.comments.forEach(comment => {
          if (comment.user_id && !commentUserIds.includes(comment.user_id.toString())) commentUserIds.push(comment.user_id.toString());
        });
      }
    });

    const users = await User.find({ _id: { $in: commentUserIds } }, '_id first_name last_name').lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    photos.forEach(photo => {
      if (photo.comments && photo.comments.length > 0) {
        photo.comments.forEach(comment => {
          const uid = comment.user_id ? comment.user_id.toString() : null;
          comment.user = uid && userMap[uid] ? userMap[uid] : null;
          delete comment.user_id;
        });
      }
    });

    res.status(200).send(photos);
  } catch (err) {
    console.error('Error in /photosOfUser/:id:', err);
    res.status(500).send({ error: 'Internal server error' });
  }
});

// --- ADD COMMENT API ---
app.post("/commentsOfPhoto/:photo_id", async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).send({ error: "Unauthorized" });
    const { photo_id } = req.params;
    const { comment } = req.body;
    if (!comment || comment.trim() === "") return res.status(400).send({ error: "Comment cannot be empty" });

    const photo = await Photo.findById(photo_id);
    if (!photo) return res.status(404).send({ error: "Photo not found" });

    const newComment = { comment: comment.trim(), user_id: req.session.user._id, date_time: new Date() };
    photo.comments.push(newComment);
    await photo.save();

    res.status(200).send(photo);
  } catch (err) {
    console.error("Error in POST /commentsOfPhoto:", err);
    res.status(500).send({ error: "Internal server error" });
  }
});

// --- Test routes ---
app.get('/test/info', async (req, res) => {
  try {
    const info = await SchemaInfo.findOne().lean();
    if (!info) return res.status(404).send({ error: 'SchemaInfo not found' });
    res.status(200).send(info);
  } catch (err) {
    console.error('Error in /test/info:', err);
    res.status(500).send({ error: 'Internal server error' });
  }
});

// // ==== UPLOADING AND STORING NEW PHOTOS API
import multer from "multer";
import fs from "fs";

const processFormBody = multer({ storage: multer.memoryStorage() }).single('uploadedphoto');

app.post("/photos/new", (req, res) => {
  processFormBody(req, res, async (err) => {
    if (err || !req.file) {
      return res.status(400).send({ error: "No file uploaded or error occurred" });
    }

    if (!req.session.user) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    const timestamp = Date.now();
    const filename = "U" + timestamp + req.file.originalname;

    fs.writeFile(`./images/${filename}`, req.file.buffer, async (err) => {
      if (err) {
        return res.status(500).send({ error: "Failed to save file" });
      }

      try {
        const newPhoto = await Photo.create({
          file_name: filename,
          date_time: new Date(),
          user_id: req.session.user._id
        });

        return res.status(200).send(newPhoto);
      } catch (dbErr) {
        console.error("DB save error:", dbErr);
        return res.status(500).send({ error: "Failed saving photo metadata" });
      }
    });
  });
});
