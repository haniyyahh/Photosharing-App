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

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});


// --- AUTHENTICATION MIDDLEWARE ---
// Protect all routes except /admin/login and /admin/logout
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
  try {
    const { login_name } = req.body;
    if (!login_name) {
      return res.status(400).send({ error: 'login_name required' });
    }
    
    // Find user by login_name (make sure your User schema has this field)
    const user = await User.findOne({ login_name }).lean();
    if (!user) {
      return res.status(400).send({ error: 'Invalid login_name' });
    }

    // Save user info in session (minimal info)
    req.session.user = { _id: user._id.toString(), first_name: user.first_name };

    // Return minimal user info
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
    res.clearCookie('connect.sid'); // clear cookie in browser
    return res.status(200).send({ message: 'Logged out successfully' });
  });
});



mongoose.Promise = bluebird;
mongoose.set("strictQuery", false);
// mongoose.connect("mongodb://127.0.0.1/project2", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });
mongoose.connect("mongodb://127.0.0.1/project2", {
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

// We have the express static module
// (http://expressjs.com/en/starter/static-files.html) do all the work for us.
app.use(express.static(__dirname));

app.get("/", function (request, response) {
  response.send("Simple web server of files from " + __dirname);
});

/**
 * /test/info - Returns the SchemaInfo object of the database in JSON format.
 *              This is good for testing connectivity with MongoDB.
 */

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
 * /test/counts - Returns an object with the counts of the different collections
 *                in JSON format.
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

// /user/list - Return all users with minimal fields for the sidebar
app.get('/user/list', async (req, res) => {
  try {
    // fetch only _id, first_name, last_name
    const users = await User.find({}, '_id first_name last_name').lean();
    res.status(200).send(users);
  } catch (err) {
    console.error('Error in /user/list:', err);
    res.status(500).send({ error: 'Internal server error' });
  }
});

// /user/:id - Return detailed info for one user by _id
app.get('/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ error: 'Invalid user id format' });
    }
    
    //fFind user with needed fields
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

// /photosOfUser/:id - Return photos of user including comments with minimal user info in comments
app.get('/photosOfUser/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ error: 'Invalid user id format' });
    }

    // fetch photos of this user, excluding __v (because mocha test removes it)
    const photos = await Photo.find({ user_id: userId }).select('-__v').lean();

    if (!photos || photos.length === 0) {
      return res.status(404).send({ error: 'Photos not found' });
    }

    // collect all user_ids from all comments across photos
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

    // fetch all the users for those IDs
    const users = await User.find(
      { _id: { $in: commentUserIds } },
      '_id first_name last_name'
    ).lean();

    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = u;
    });

    // replace comment.user_id with comment.user object
    photos.forEach(photo => {
      if (photo.comments && photo.comments.length > 0) {
        photo.comments.forEach(comment => {
          const userIdStr = comment.user_id ? comment.user_id.toString() : null;
          if (userIdStr && userMap[userIdStr]) {
            comment.user = userMap[userIdStr];
          } else {
            comment.user = null;
          }
          delete comment.user_id; // remove user_id
        });
      }
      delete photo.__v; // remove __v because mocha test removes it
    });

    return res.status(200).send(photos);
  } catch (err) {
    console.error('Error in /photosOfUser/:id:', err);
    return res.status(500).send({ error: 'Internal server error' });
  }
});

