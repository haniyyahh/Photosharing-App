import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

// NEW: Zustand store import
import useZustandStore from '../../zustandStore';

function UserComments() {
  const { userId } = useParams();
  const navigate = useNavigate();

  // NEW: pull global setters to keep UI state consistent
  const setSelectedUserId = useZustandStore((s) => s.setSelectedUserId);
  const setSelectedPhotoId = useZustandStore((s) => s.setSelectedPhotoId);

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // fetch all photos of this user with comments included
  useEffect(() => {
    const fetchComments = async () => {
      try {
        // fetch all photos for userId
        const photosRes = await axios.get(`http://localhost:3001/photosOfUser/${userId}`);
        const photos = photosRes.data;

        // extract all comments authored by userId
        const userComments = [];

        photos.forEach(photo => {
          if (photo.comments) {
            photo.comments.forEach(comment => {
              if (comment.user && comment.user._id === userId) {
                // include photo metadata for UI navigation
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

        setComments(userComments);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [userId]);

  if (loading) return <div>Loading information...</div>;
  if (error) return <div>Error with loading user: {error.message}</div>;

  if (comments.length === 0) {
    return <Typography>No comments authored by this user.</Typography>;
  }

  return (
    <List>
      {comments.map((comment) => (
        <ListItem
          key={comment._id}
          button
          onClick={() => {
            // NEW: sync state to global store
            setSelectedUserId(comment.photoUserId);
            setSelectedPhotoId(comment.photoId);

            // Navigate to the correct photo page
            navigate(`/photos/${comment.photoUserId}/${comment.photoId}`);
          }}
          alignItems="flex-start"
        >
          <ListItemAvatar>
            <Avatar
              variant="rounded"
              src={`http://localhost:3001/images/${comment.photoUrl}`}
              alt="Photo thumbnail"
              sx={{ width: 80, height: 80, marginRight: 2 }}
            />
          </ListItemAvatar>
          <ListItemText primary={comment.comment} />
        </ListItem>
      ))}
    </List>
  );
}

export default UserComments;