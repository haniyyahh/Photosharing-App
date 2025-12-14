/**
 * Project 3 Express server connected to MongoDB 'project3'.
 * Start with: node webServer.js
 */

import mongoose from "mongoose";
import bluebird from "bluebird";
import express from "express";
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import session from 'express-session';
import multer from "multer";
import fs from "fs";

import User from "./schema/user.js";
import Photo from "./schema/photo.js";
import SchemaInfo from "./schema/schemaInfo.js";

const portno = 3001;
const app = express();

app.use(express.json());

app.use(
  session({
    secret: "SECRETKEY",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

// CORS
const allowedOrigin = "http://localhost:3000";
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});

// AUTH MIDDLEWARE
app.use((req, res, next) => {
  const isLogin = req.path === "/admin/login" && req.method === "POST";
  const isLogout = req.path === "/admin/logout" && req.method === "POST";
  const isCreateUser = req.path === "/user" && req.method === "POST";

  if (isLogin || isLogout || isCreateUser) {
    return next();
  }

  if (!req.session.user) {
    return res.status(401).send({ error: "Unauthorized: Please login" });
  }

  return next();
});

// LOGIN
app.post("/admin/login", async (req, res) => {
  try {
    const { login_name, password } = req.body;
    if (!login_name || !password) {
      return res
        .status(400)
        .send({ error: "login_name and password required" });
    }

    const user = await User.findOne({ login_name }).lean();
    if (!user || user.password !== password) {
      return res.status(400).send({ error: "Invalid login_name or password" });
    }

    req.session.user = {
      _id: user._id.toString(),
      first_name: user.first_name,
    };

    return res.status(200).send({
      _id: user._id.toString(),
      first_name: user.first_name,
    });
  } catch (err) {
    console.error("Error in /admin/login:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// LOGOUT
app.post("/admin/logout", async (req, res) => {
  if (!req.session.user) {
    return res.status(400).send({ error: "No user logged in" });
  }

  try {
    await new Promise((resolve, reject) => {
      req.session.destroy(err => (err ? reject(err) : resolve()));
    });

    return res.status(200).send({ success: true });
  } catch (err) {
    return res.status(500).send({ error: "Logout failed" });
  }
});

// CREATE USER
app.post("/user", async (req, res) => {
  try {
    const {
      login_name,
      password,
      first_name,
      last_name,
      location,
      description,
      occupation,
    } = req.body;

    if (!login_name || !password || !first_name || !last_name) {
      return res.status(400).send({
        error:
          "Required fields: login_name, password, first_name, last_name",
      });
    }

    const existing = await User.findOne({ login_name }).lean();
    if (existing) {
      return res.status(400).send({ error: "login_name already exists" });
    }

    const newUser = await User.create({
      login_name,
      password,
      first_name,
      last_name,
      location: location || "",
      description: description || "",
      occupation: occupation || "",
    });

    return res.status(200).send({
      login_name: newUser.login_name,
      user_id: newUser._id.toString(),
    });
  } catch (err) {
    console.error("Error in POST /user:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// USER LIST
app.get("/user/list", async (req, res) => {
  try {
    const users = await User.find({}, "_id first_name last_name").lean();
    return res.status(200).send(
      users.map((u) => ({
        _id: u._id.toString(),
        first_name: u.first_name,
        last_name: u.last_name,
      }))
    );
  } catch (err) {
    console.error("Error in /user/list:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// USER DETAILS
app.get("/user/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ error: "Invalid user id format" });
    }

    const user = await User.findById(
      userId,
      "_id first_name last_name location description occupation"
    ).lean();

    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    return res.status(200).send({
      _id: user._id.toString(),
      first_name: user.first_name,
      last_name: user.last_name,
      location: user.location,
      description: user.description,
      occupation: user.occupation,
    });
  } catch (err) {
    console.error("Error in /user/:id:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

//PHOTOS OF USER
app.get("/photosOfUser/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ error: "Invalid user id format" });
    }

    const photos = await Photo.find({ user_id: userId })
      .select("-__v")
      .lean();

    // Return empty array if no photos
    if (!photos || photos.length === 0) {
      return res.status(200).send([]);  // <-- changed from 404
    }

    const commentUserIds = [];

    photos.forEach((photo) => {
      photo._id = photo._id.toString();

      if (photo.comments) {
        photo.comments.forEach((c) => {
          if (c.user_id) {
            const id = c.user_id.toString();
            if (!commentUserIds.includes(id)) {
              commentUserIds.push(id);
            }
          }
        });
      }
    });

    const users = await User.find(
      { _id: { $in: commentUserIds } },
      "_id first_name last_name"
    ).lean();

    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = u;
    });

    photos.forEach((photo) => {
      if (photo.comments) {
        photo.comments.forEach((c) => {
          const uid = c.user_id ? c.user_id.toString() : null;
          c.user = uid && userMap[uid]
            ? {
                _id: uid,
                first_name: userMap[uid].first_name,
                last_name: userMap[uid].last_name,
              }
            : null;
          delete c.user_id;
        });
      }
    });

    return res.status(200).send(photos);
  } catch (err) {
    console.error("Error in /photosOfUser/:id:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// FETCHING ALL COMMENTS OWNED BY A USER
app.get("/commentsByUser/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ error: "Invalid user id format" });
    }

    // Find all photos that have comments by this user
    const photos = await Photo.find({ "comments.user_id": userId }).lean();

    const userComments = [];

    photos.forEach(photo => {
      if (photo.comments) {
        photo.comments.forEach(comment => {
          if (comment.user_id && comment.user_id.toString() === userId) {
            userComments.push({
              ...comment,
              photoId: photo._id.toString(),
              photoUrl: photo.file_name,
              photoUserId: photo.user_id.toString(),
            });
          }
        });
      }
    });

    return res.status(200).send(userComments);
  } catch (err) {
    console.error("Error in /commentsByUser/:userId:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});




//ADD COMMENT
app.post("/commentsOfPhoto/:photo_id", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    const { photo_id } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim() === "") {
      return res.status(400).send({ error: "Comment cannot be empty" });
    }

    const photo = await Photo.findById(photo_id);
    if (!photo) {
      return res.status(404).send({ error: "Photo not found" });
    }

    photo.comments.push({
      comment: comment.trim(),
      user_id: req.session.user._id,
      date_time: new Date(),
    });

    await photo.save();

    return res.status(200).send(photo);
  } catch (err) {
    console.error("Error in POST /commentsOfPhoto:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// TEST ROUTE
app.get("/test/info", async (req, res) => {
  try {
    const info = await SchemaInfo.findOne().lean();

    if (!info) {
      return res.status(404).send({ error: "SchemaInfo not found" });
    }

    return res.status(200).send(info);
  } catch (err) {
    console.error("Error in /test/info:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

//PHOTO UPLOAD
app.use(
  "/images",
  express.static(path.join(dirname(fileURLToPath(import.meta.url)), "images"))
);

const processFormBody = multer({
  storage: multer.memoryStorage(),
}).single("uploadedphoto");

app.post("/photos/new", (req, res) => {
  processFormBody(req, res, async (multerErr) => {
    if (multerErr || !req.file) {
      return res.status(400).send({ error: "No file uploaded or error occurred" });
    }

    if (!req.session.user) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    const timestamp = Date.now();
    const filename = "U" + timestamp + req.file.originalname;

    return fs.writeFile(`./images/${filename}`, req.file.buffer, async (fsErr) => {
      if (fsErr) {
        return res.status(500).send({ error: "Failed to save file" });
      }

      try {
        const newPhoto = await Photo.create({
          file_name: filename,
          date_time: new Date(),
          user_id: req.session.user._id,
        });

        return res.status(200).send(newPhoto);
      } catch (dbErr) {
        console.error("DB save error:", dbErr);
        return res.status(500).send({ error: "Failed saving photo metadata" });
      }
    });
  });
});

// GET COMMENTS
app.get("/commentsByUser/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ error: "Invalid user id format" });
    }

    // Find all photos that contain comments by this user
    const photos = await Photo.find({ "comments.user_id": userId })
      .select("file_name date_time comments")
      .lean();

    const userComments = [];

    photos.forEach((photo) => {
      photo.comments.forEach((c) => {
        if (c.user_id && c.user_id.toString() === userId) {
          userComments.push({
            photo_id: photo._id.toString(),
            file_name: photo.file_name,
            photo_date: photo.date_time,
            comment: c.comment,
            comment_date: c.date_time,
          });
        }
      });
    });

    return res.status(200).send(userComments);
  } catch (err) {
    console.error("Error in /commentsByUser/:id:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// LIKE / UNLIKE PHOTOS
app.post("/photos/:photoId/like", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    const { photoId } = req.params;
    const userId = req.session.user._id;

    if (!mongoose.Types.ObjectId.isValid(photoId)) {
      return res.status(400).send({ error: "Invalid photo id format" });
    }

    const photo = await Photo.findById(photoId);
    if (!photo) {
      return res.status(404).send({ error: "Photo not found" });
    }

    const alreadyLiked = photo.likes.some(
      (id) => id.toString() === userId
    );

    if (alreadyLiked) {
      // UNLIKE
      photo.likes = photo.likes.filter(
        (id) => id.toString() !== userId
      );
    } else {
      // LIKE
      photo.likes.push(userId);
    }

    await photo.save();

    return res.status(200).send({
      photoId: photo._id.toString(),
      likesCount: photo.likes.length,
      likedByUser: !alreadyLiked,
    });
  } catch (err) {
    console.error("Error in POST /photos/:photoId/like:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// ======== DELETING COMMENTS/PHOTOS/ACCOUNT ===========
// DELETE A COMMENT
app.delete("/comments/:commentId/photo/:photoId", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    const { commentId, photoId } = req.params;
    const currentUserId = req.session.user._id;

    if (!mongoose.Types.ObjectId.isValid(photoId)) {
      return res.status(400).send({ error: "Invalid photo id format" });
    }

    const photo = await Photo.findById(photoId);
    if (!photo) {
      return res.status(404).send({ error: "Photo not found" });
    }

    const commentIndex = photo.comments.findIndex(
      (c) => c._id.toString() === commentId
    );

    if (commentIndex === -1) {
      return res.status(404).send({ error: "Comment not found" });
    }

    // Check ownership
    if (photo.comments[commentIndex].user_id.toString() !== currentUserId) {
      return res.status(403).send({ error: "You can only delete your own comments" });
    }

    // deletion occurs here
    photo.comments.splice(commentIndex, 1);
    await photo.save();

    return res.status(200).send({ 
      success: true, 
      message: "Comment deleted successfully" 
    });
  } catch (err) {
    console.error("Error in DELETE /comments/:commentId/photo/:photoId:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// DELETE A PHOTO
app.delete("/photos/:photoId", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    const { photoId } = req.params;
    const currentUserId = req.session.user._id;

    if (!mongoose.Types.ObjectId.isValid(photoId)) {
      return res.status(400).send({ error: "Invalid photo id format" });
    }

    const photo = await Photo.findById(photoId);
    if (!photo) {
      return res.status(404).send({ error: "Photo not found" });
    }

    // Check ownership
    if (photo.user_id.toString() !== currentUserId) {
      return res.status(403).send({ error: "You can only delete your own photos" });
    }

    // Delete physical file
    const filePath = path.join(dirname(fileURLToPath(import.meta.url)), "images", photo.file_name);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileErr) {
      console.error("Error deleting file:", fileErr);
    }

    await Photo.findByIdAndDelete(photoId);

    return res.status(200).send({ 
      success: true, 
      message: "Photo deleted successfully" 
    });
  } catch (err) {
    console.error("Error in DELETE /photos/:photoId:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// DELETE USER ACCOUNT
app.delete("/user/:userId", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    const { userId } = req.params;
    const currentUserId = req.session.user._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ error: "Invalid user id format" });
    }

    // Check that user can only delete their own account
    if (userId !== currentUserId) {
      return res.status(403).send({ error: "You can only delete your own account" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    // 1. Delete all photos by this user (and their files)
    const userPhotos = await Photo.find({ user_id: userId });
    
    for (const photo of userPhotos) {
      const filePath = path.join(
        dirname(fileURLToPath(import.meta.url)), 
        "images", 
        photo.file_name
      );
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileErr) {
        console.error("Error deleting file:", fileErr);
      }
    }

    await Photo.deleteMany({ user_id: userId });

    // 2. Delete all comments made by this user
    await Photo.updateMany(
      { "comments.user_id": userId },
      { $pull: { comments: { user_id: userId } } }
    );

    // 3. Remove user from all photo likes
    await Photo.updateMany(
      { likes: userId },
      { $pull: { likes: userId } }
    );

    // 4. Delete the user document
    await User.findByIdAndDelete(userId);

    // 5. Destroy the session
    await new Promise((resolve, reject) => {
      req.session.destroy((err) => (err ? reject(err) : resolve()));
    });

    return res.status(200).send({ 
      success: true, 
      message: "User account deleted successfully" 
    });
  } catch (err) {
    console.error("Error in DELETE /user/:userId:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});


// DB CONNECTION
mongoose.Promise = bluebird;
mongoose.set("strictQuery", false);

mongoose
  .connect("mongodb://127.0.0.1/project3", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log(`MongoDB connected. Server running at http://localhost:${portno}`)
  )
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

app.listen(portno);