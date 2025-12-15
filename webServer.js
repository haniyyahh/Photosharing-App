
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
import http from "http";
import { Server } from "socket.io";

import User from "./schema/user.js";
import Photo from "./schema/photo.js";
import SchemaInfo from "./schema/schemaInfo.js";
import Activity from "./schema/activity.js";

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

// SOCKET.IO SETUP
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// ============================================
// HELPER FUNCTION: Create Activity with Socket.IO
// ============================================
async function createActivity(activityType, userId, photoId = null, fileName = null) {
  try {
    const newActivity = await Activity.create({
      activity_type: activityType,
      user_id: userId,
      photo_id: photoId,
      file_name: fileName,
      date_time: new Date()
    });

    // Fetch user info for the activity
    const user = await User.findById(userId, '_id first_name last_name').lean();

    // Fetch photo owner ID if this activity involves a photo
    let photoOwnerId = null;
    if (photoId) {
      const photo = await Photo.findById(photoId, 'user_id').lean();
      if (photo) {
        photoOwnerId = photo.user_id.toString();
      }
    }

    // Format activity for socket emission
    const activityData = {
      _id: newActivity._id.toString(),
      activity_type: newActivity.activity_type,
      date_time: newActivity.date_time,
      photo_id: newActivity.photo_id ? newActivity.photo_id.toString() : null,
      file_name: newActivity.file_name,
      photo_owner_id: photoOwnerId,
      user: user ? {
        _id: user._id.toString(),
        first_name: user.first_name,
        last_name: user.last_name
      } : null
    };

    // Emit real-time update to all connected clients
    io.emit('new_activity', activityData);

    console.log('Activity created and emitted:', activityType);
  } catch (err) {
    console.error('Error creating activity:', err);
  }
}

// ============================================
// AUTHENTICATION ROUTES
// ============================================

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

    // Log activity
    await createActivity('USER_LOGIN', user._id.toString());

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
    const userId = req.session.user._id;
    
    // Log activity BEFORE destroying session
    await createActivity('USER_LOGOUT', userId);

    await new Promise((resolve, reject) => {
      req.session.destroy(err => (err ? reject(err) : resolve()));
    });

    return res.status(200).send({ success: true });
  } catch (err) {
    return res.status(500).send({ error: "Logout failed" });
  }
});

// CREATE USER (REGISTER)
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
        error: "Required fields: login_name, password, first_name, last_name",
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

    // Log activity
    await createActivity('USER_REGISTER', newUser._id.toString());

    return res.status(200).send({
      login_name: newUser.login_name,
      user_id: newUser._id.toString(),
    });
  } catch (err) {
    console.error("Error in POST /user:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// ============================================
// USER ROUTES
// ============================================

// USER LIST
app.get("/user/list", async (req, res) => {
  try {
    const users = await User.find({}, "_id first_name last_name").lean();

    const userIds = users.map(u => u._id);

    // get latest activity per user
    const activities = await Activity.aggregate([
      { $match: { user_id: { $in: userIds } } },
      { $sort: { date_time: -1 } },
      {
        $group: {
          _id: "$user_id",
          activity_type: { $first: "$activity_type" },
          date_time: { $first: "$date_time" },
          photo_id: { $first: "$photo_id" },
          file_name: { $first: "$file_name" },
        }
      }
    ]);

    const activityMap = {};
    activities.forEach(a => {
      activityMap[a._id.toString()] = a;
    });

    const response = users.map(u => ({
      _id: u._id.toString(),
      first_name: u.first_name,
      last_name: u.last_name,
      lastActivity: activityMap[u._id.toString()] || null
    }));

    return res.status(200).send(response);
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

// USER STATS (most recent photo, most commented photo) with visibility
app.get("/user/:userId/stats", async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.session.user._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ error: "Invalid user id format" });
    }

    const userPhotos = await Photo.find({
      user_id: userId,
      $or: [
        { sharedWith: { $exists: false } }, // legacy / default
        { sharedWith: null },               // public
        { sharedWith: { $size: 0 } },       // public
        { user_id: currentUserId },         // viewer owns photo
        { sharedWith: currentUserId },      // explicitly shared
      ],
    })
      .select("_id file_name date_time comments")
      .lean();

    if (!userPhotos || userPhotos.length === 0) {
      return res.status(200).send({
        mostRecentPhoto: null,
        mostCommentedPhoto: null,
      });
    }

    const mostRecentPhoto = userPhotos.reduce((latest, photo) =>
      new Date(photo.date_time) > new Date(latest.date_time)
        ? photo
        : latest
    );

    const mostCommentedPhoto = userPhotos.reduce((most, photo) => {
      const count = photo.comments?.length || 0;
      const bestCount = most.comments?.length || 0;
      return count > bestCount ? photo : most;
    });

    return res.status(200).send({
      mostRecentPhoto: {
        _id: mostRecentPhoto._id.toString(),
        file_name: mostRecentPhoto.file_name,
        date_time: mostRecentPhoto.date_time,
      },
      mostCommentedPhoto: {
        _id: mostCommentedPhoto._id.toString(),
        file_name: mostCommentedPhoto.file_name,
        comment_count: mostCommentedPhoto.comments?.length || 0,
      },
    });
  } catch (err) {
    console.error("Error in /user/:userId/stats:", err);
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

    if (userId !== currentUserId) {
      return res.status(403).send({ error: "You can only delete your own account" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

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

    await Photo.updateMany(
      { "comments.user_id": userId },
      { $pull: { comments: { user_id: userId } } }
    );

    await Photo.updateMany(
      { likes: userId },
      { $pull: { likes: userId } }
    );

    await User.findByIdAndDelete(userId);

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

// ============================================
// PHOTO ROUTES
// ============================================

// PHOTOS OF USER
app.get("/photosOfUser/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ error: "Invalid user id format" });
    }

    // visibility logic
    const currentUserId = req.session.user._id;

    const photos = await Photo.find({
      user_id: userId,
      $or: [
        { sharedWith: { $exists: false } }, // legacy / default
        { sharedWith: null },               // explicitly public
        { sharedWith: { $size: 0 } },       // empty array = public
        { user_id: currentUserId },         // owner
        { sharedWith: currentUserId },      // explicitly shared
      ],
    })
    .select("-__v")
    .lean();

    if (!photos || photos.length === 0) {
      return res.status(200).send([]);
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

// PHOTO UPLOAD
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
        // handles sharing permissions
        let sharedWith = null; // null = visible to everyone

        if (req.body.sharedWith) {
          try {
            sharedWith = JSON.parse(req.body.sharedWith); // [] or [userIds]
          } catch (e) {
            return res.status(400).send({ error: "Invalid sharedWith format" });
          }
        }

        const newPhoto = await Photo.create({
          file_name: filename,
          date_time: new Date(),
          user_id: req.session.user._id,
          sharedWith,
        });

        // Log activity with Socket.IO
        await createActivity(
          'PHOTO_UPLOAD',
          req.session.user._id,
          newPhoto._id.toString(),
          filename
        );

        return res.status(200).send(newPhoto);
      } catch (dbErr) {
        console.error("DB save error:", dbErr);
        return res.status(500).send({ error: "Failed saving photo metadata" });
      }
    });
  });
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
      photo.likes = photo.likes.filter(
        (id) => id.toString() !== userId
      );
    } else {
      photo.likes.push(userId);
    }

    await photo.save();

    // emit real-time update
    io.emit("photo_likes_updated", {
      photoId: photo._id.toString(),
    });

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

    if (photo.user_id.toString() !== currentUserId) {
      return res.status(403).send({ error: "You can only delete your own photos" });
    }

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

// ============================================
// COMMENT ROUTES
// ============================================

// GET COMMENTS BY USER (with visibility enforcement)
app.get("/commentsByUser/:userId", async (req, res) => {
  try {
    const commentUserId = req.params.userId;
    const currentUserId = req.session.user._id;

    if (!mongoose.Types.ObjectId.isValid(commentUserId)) {
      return res.status(400).send({ error: "Invalid user id format" });
    }

    const photos = await Photo.find({
      "comments.user_id": commentUserId,

      // VISIBILITY RULES
      $or: [
        { sharedWith: { $exists: false } },
        { sharedWith: null },
        { sharedWith: { $size: 0 } },
        { user_id: currentUserId },     // viewer owns photo
        { sharedWith: currentUserId },  // explicitly shared
      ],
    }).lean();

    const userComments = [];

    photos.forEach((photo) => {
      photo.comments?.forEach((comment) => {
        if (comment.user_id.toString() === commentUserId) {
          userComments.push({
            ...comment,
            photoId: photo._id.toString(),
            photoUrl: photo.file_name,
            photoUserId: photo.user_id.toString(),
          });
        }
      });
    });

    return res.status(200).send(userComments);
  } catch (err) {
    console.error("Error in /commentsByUser/:userId:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// ADD COMMENT
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

    // Log activity with Socket.IO
    await createActivity(
      'COMMENT_ADDED',
      req.session.user._id,
      photo._id.toString(),
      photo.file_name
    );

    return res.status(200).send(photo);
  } catch (err) {
    console.error("Error in POST /commentsOfPhoto:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

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

    if (photo.comments[commentIndex].user_id.toString() !== currentUserId) {
      return res.status(403).send({ error: "You can only delete your own comments" });
    }

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

// ============================================
// ACTIVITY FEED ROUTE
// ============================================

app.get("/activities", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    const activities = await Activity.find({})
      .sort({ date_time: -1 })
      .limit(5)
      .lean();

    const userIds = activities.map(a => a.user_id);
    const users = await User.find(
      { _id: { $in: userIds } },
      '_id first_name last_name'
    ).lean();

    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = u;
    });

    // Fetch photo owner IDs for activities with photos
    const photoIds = activities
      .filter(a => a.photo_id)
      .map(a => a.photo_id);
    
    const photos = await Photo.find(
      { _id: { $in: photoIds } },
      '_id user_id'
    ).lean();

    const photoOwnerMap = {};
    photos.forEach(p => {
      photoOwnerMap[p._id.toString()] = p.user_id.toString();
    });

    const enhancedActivities = activities.map(activity => ({
      _id: activity._id.toString(),
      activity_type: activity.activity_type,
      date_time: activity.date_time,
      photo_id: activity.photo_id ? activity.photo_id.toString() : null,
      file_name: activity.file_name,
      photo_owner_id: activity.photo_id ? photoOwnerMap[activity.photo_id.toString()] : null,
      user: userMap[activity.user_id.toString()] ? {
        _id: activity.user_id.toString(),
        first_name: userMap[activity.user_id.toString()].first_name,
        last_name: userMap[activity.user_id.toString()].last_name
      } : null
    }));

    return res.status(200).send(enhancedActivities);
  } catch (err) {
    console.error("Error in /activities:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});

// ============================================
// TEST ROUTE
// ============================================

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

// ============================================
// DATABASE CONNECTION
// ============================================

mongoose.Promise = bluebird;
mongoose.set("strictQuery", false);

mongoose
  .connect("mongodb://127.0.0.1/project3", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log(`MongoDB connected. Server running at http://localhost:${portno}`))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

server.listen(portno, () => {
  console.log(`Server running at http://localhost:${portno}`);
});