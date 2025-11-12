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

function UserComments() {
  const { userId } = useParams();
  const navigate = useNavigate();

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

        // extract all comments authored by userId (the user who made the comment)
        const userComments = [];

        photos.forEach(photo => {
          if (photo.comments) {
            photo.comments.forEach(comment => {
              if (comment.user && comment.user._id === userId) {
                // add photo info to comment for display/navigation
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
        {/* display all comments as a list: include 
        - photo thumbnail
        - comment's text
        
        */}
      {comments.map((comment) => (
        <ListItem
          key={comment._id}
          button
          onClick={() => navigate(`/photos/${comment.photoUserId}/${comment.photoId}`)}
          alignItems="flex-start"
        >
          <ListItemAvatar>
            <Avatar
              variant="rounded"
              src={`http://localhost:3001/images/${comment.photoUrl}`} // adjust path to your static files
              alt="Photo thumbnail"
              sx={{ width: 80, height: 80, marginRight: 2 }}
            />
          </ListItemAvatar>
          <ListItemText
            primary={comment.comment}
            // secondary={
            //   <Typography variant="caption" color="text.secondary">
            //     Posted on photo ID: {comment.photoId}
            //   </Typography>
            // }
          />
        </ListItem>
      ))}
    </List>
  );
}

export default UserComments;
