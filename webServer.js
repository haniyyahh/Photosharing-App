/**
 * Project 2 Express server connected to MongoDB 'project2'.
 * Start with: node webServer.js
 * Client uses axios to call these endpoints.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import mongoose from "mongoose";
// eslint-disable-next-line import/no-extraneous-dependencies
import bluebird from "bluebird";
import express from "express";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import session from 'express-session';

// ToDO - Your submission should work without this line. Comment out or delete this line for tests and before submission!
// import models from "./modelData/photoApp.js";

// Load the Mongoose schema for User, Photo, and SchemaInfo
// ToDO - Your submission will use code below, so make sure to uncomment this line for tests and before submission!
import User from "./schema/user.js";
import Photo from "./schema/photo.js";
import SchemaInfo from "./schema/schemaInfo.js";

const portno = 3001; // Port number to use
const app = express();

// Add middleware to parse JSON bodies
app.use(express.json());

// --- Add session middleware ---
app.use(session({
  secret: 'SECRETKEY', // replace with a strong secret in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true if using HTTPS
}));
const allowedOrigin = 'http://localhost:3000';

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// --- AUTHENTICATION MIDDLEWARE ---
app.use((req, res, next) => {
  if (req.path === '/admin/login' || req.path === '/admin/logout') {
    return next();
  }
  if (!req.session.user) {
    return res.status(401).send({ error: 'Unauthorized: Please login' });
  }
  next();
});

// --- LOGIN endpoint ---
app.post('/admin/login', async (req, res) => {
  console.log('Request body on login:', req.body);
  try {
    const { login_name } = req.body;
    if (!login_name) {
      return res.status(400).send({ error: 'login_name required' });
    }

    const user = await User.findOne({ login_name }).lean();
    if (!user) {
      return res.status(400).send({ error: 'Invalid login_name' });
    }

    req.session.user = { _id: user._id.toString(), first_name: user.first_name };

    return res.status(200).send({ _id: user._id.toString(), first_name: user.first_name });
  } catch (err) {
    console.error('Error in /admin/login:', err);
    return res.status(500).send({ error: 'Internal server error' });
  }
});

// --- LOGOUT endpoint ---
app.post('/admin/logout', (req, res) => {
  if (!req.session.user) {
    return res.status(400).send({ error: 'Not logged in' });
  }

  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send({ error: 'Internal server error' });
    }
    res.clearCookie('connect.sid');
    return res.status(200).send({ message: 'Logged out successfully' });
  });
});

mongoose.Promise = bluebird;
mongoose.set("strictQuery", false);
mongoose.connect("mongodb://127.0.0.1/project3", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected');

  app.get('/', (req, res) => {
    res.send('Hello World!');
  });

  app.listen(portno, () => {
    console.log(`Server listening on http://localhost:${portno}`);
  });
})
.catch(err => {
  console.error('Failed to connect to MongoDB:', err);
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Static files
app.use(express.static(__dirname));

app.get("/", function (request, response) {
  response.send("Simple web server of files from " + __dirname);
});

/**
 * /test/info - Returns the SchemaInfo object of the database in JSON format.
 */
app.get('/test/info', async (req, res) => {
  try {
    const info = await SchemaInfo.findOne().lean();
    if (!info) {
      return res.status(404).send({ error: 'SchemaInfo not found' });
    }
    return res.status(200).send(info);
  } catch (err) {
    console.error('Error in /test/info:', err);
    return res.status(500).send({ error: 'Internal server error' });
  }
});

/**
 * /test/counts - Returns count of collections.
 */
app.get('/test/counts', async (req, res) => {
  try {
    const [userCount, photoCount, schemaCount] = await Promise.all([
      User.countDocuments({}),
      Photo.countDocuments({}),
      SchemaInfo.countDocuments({})
    ]);
    res.status(200).send({
      user: userCount,
      photo: photoCount,
      schemaInfo: schemaCount
    });
  } catch (err) {
    console.error('Error in /test/counts:', err);
    res.status(500).send({ error: 'Internal server error' });
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
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ error: 'Invalid user id format' });
    }

    const user = await User.findById(userId, '_id first_name last_name location description occupation').lean();

    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }

    return res.status(200).send(user);
  } catch (err) {
    console.error('Error in /user/:id:', err);
    return res.status(500).send({ error: 'Internal server error' });
  }
});

// /photosOfUser/:id
app.get('/photosOfUser/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ error: 'Invalid user id format' });
    }

    const photos = await Photo.find({ user_id: userId }).select('-__v').lean();

    if (!photos || photos.length === 0) {
      return res.status(404).send({ error: 'Photos not found' });
    }

    const commentUserIds = [];
    photos.forEach(photo => {
      if (photo.comments && photo.comments.length > 0) {
        photo.comments.forEach(comment => {
          if (comment.user_id && !commentUserIds.includes(comment.user_id.toString())) {
            commentUserIds.push(comment.user_id.toString());
          }
        });
      }
    });

    const users = await User.find(
      { _id: { $in: commentUserIds } },
      '_id first_name last_name'
    ).lean();

    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = u;
    });

    photos.forEach(photo => {
      if (photo.comments && photo.comments.length > 0) {
        photo.comments.forEach(comment => {
          const userIdStr = comment.user_id ? comment.user_id.toString() : null;
          if (userIdStr && userMap[userIdStr]) {
            comment.user = userMap[userIdStr];
          } else {
            comment.user = null;
          }
          delete comment.user_id;
        });
      }
      delete photo.__v;
    });

    return res.status(200).send(photos);
  } catch (err) {
    console.error('Error in /photosOfUser/:id:', err);
    return res.status(500).send({ error: 'Internal server error' });
  }
});

// --- ADD COMMENT API ---

app.post("/commentsOfPhoto/:photo_id", async (req, res) => {
  try {
    const { photo_id } = req.params;
    const { comment } = req.body;

    // must be logged in
    if (!req.session.user) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    // validate comment
    if (!comment || comment.trim() === "") {
      return res.status(400).send({ error: "Comment cannot be empty" });
    }

    // find photo
    const photo = await Photo.findById(photo_id);
    if (!photo) {
      return res.status(404).send({ error: "Photo not found" });
    }

    // build comment
    const newComment = {
      comment: comment.trim(),
      user_id: req.session.user._id,
      date_time: new Date(),
    };

    // push comment & save
    photo.comments.push(newComment);
    await photo.save();

    return res.status(200).send(photo);
  } catch (err) {
    console.error("Error in POST /commentsOfPhoto:", err);
    return res.status(500).send({ error: "Internal server error" });
  }
});