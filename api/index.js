import axios from "axios";

// Reusable axios instance
const api = axios.create({
  baseURL: "http://localhost:3001",
});

// -----------------------------
// GET REQUESTS
// -----------------------------

// GET /user/list -> all users (id, first_name, last_name)
export const fetchUsers = async () => {
  const res = await api.get("/user/list");
  return res.data;
};

// GET /user/:id -> single user details
export const fetchUserById = async (id) => {
  const res = await api.get(`/user/${id}`);
  return res.data;
};

// GET /photosOfUser/:id -> photos + comments + embedded user data
export const fetchPhotosByUser = async (id) => {
  const res = await api.get(`/photosOfUser/${id}`);
  return res.data;
};

export async function fetchUserComments(userId) {
  const photosRes = await api.get(`/photosOfUser/${userId}`);
  const photos = photosRes.data;

  // extract all comments authored by userId
  const userComments = [];

  photos.forEach(photo => {
    if (photo.comments) {
      photo.comments.forEach(comment => {
        if (comment.user && comment.user._id === userId) {
          userComments.push({
            ...comment,
            photoId: photo._id,
            photoUrl: photo.file_name,
            photoUserId: photo.user_id,
          });
        }
      });
    }
  });

  return userComments;
}

// -----------------------------
// POST / PUT / DELETE REQUESTS
// 
// -----------------------------

// Example: POST a new comment
// export const postComment = async ({ photoId, comment }) => {
//   const res = await api.post(`/commentsOfPhoto/${photoId}`, comment);
//   return res.data;
// };

// // Example: DELETE a photo (if you add)
// export const deletePhoto = async (photoId) => {
//   const res = await api.delete(`/photo/${photoId}`);
//   return res.data;
// };

// // Example: PUT update user (if you add)
// export const updateUser = async ({ userId, data }) => {
//   const res = await api.put(`/user/${userId}`, data);
//   return res.data;
// };

export default api;
