import axios from "axios";
import useZustandStore from "../zustandStore";

// Reusable axios instance
const api = axios.create({
  baseURL: "http://localhost:3001",
  withCredentials: true,
});

// RESPONSE INTERCEPTOR (401 handler)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      try {
        // Reset Zustand store safely
        const resetStore = useZustandStore.getState().resetStore;
        resetStore();
      } catch (err) {
        console.error("Zustand reset failed:", err);
      }

      // Redirect only if not already on login page
      if (window.location.pathname !== "/login-register") {
        window.location.href = "/login-register";
      }
    }

    return Promise.reject(error);
  }
);

// GET REQUESTS

export const fetchUsers = async () => {
  const res = await api.get("/user/list");
  return res.data;
};

export const fetchUserById = async (id) => {
  const res = await api.get(`/user/${id}`);
  return res.data;
};

export const fetchPhotosByUser = async (id) => {
  const res = await api.get(`/photosOfUser/${id}`);
  return res.data;
};
export async function fetchUserComments(userId) {
  const res = await api.get(`/commentsByUser/${userId}`);
  return res.data;
}
// export async function fetchUserComments(userId) {
//   const photosRes = await api.get(`/photosOfUser/${userId}`);
//   const photos = photosRes.data;

//   const userComments = [];

//   photos.forEach(photo => {
//     if (photo.comments) {
//       photo.comments.forEach(comment => {
//         if (comment.user && comment.user._id === userId) {
//           userComments.push({
//             ...comment,
//             photoId: photo._id,
//             photoUrl: photo.file_name,
//             photoUserId: photo.user_id,
//           });
//         }
//       });
//     }
//   });

//   return userComments;
// }

// POST / PUT / DELETE REQUESTS

// POST /admin/login  (NEW: includes password)
export const loginUser = async ({ login_name, password }) => {
  const res = await api.post("/admin/login", { login_name, password });
  return res.data;
};

// POST /admin/logout
export const logoutUser = async () => {
  const res = await api.post("/admin/logout");
  return res.data;
};

// POST /user  (NEW: user registration)
export const registerUser = async (data) => {
  const res = await api.post("/user", data);
  return res.data;
};

// POST comment
export const postComment = async ({ photoId, comment }) => {
  const res = await api.post(`/commentsOfPhoto/${photoId}`, comment);
  return res.data;
};

export async function addCommentToPhoto(photoId, comment) {
  const res = await api.post(`/commentsOfPhoto/${photoId}`, { comment });
  return res.data;
}

// LIKE a photo
export const likePhoto = async (photoId) => {
  const res = await api.post(`/photos/${photoId}/like`);
  return res.data;
};

// Photo Uploading w Multer: POST Request
// POST /photos/new
export async function uploadPhoto(formData) {
  const response = await fetch("http://localhost:3001/photos/new", {
    method: "POST",
    credentials: "include", // important for session login
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  return response.json();
}

export default api;