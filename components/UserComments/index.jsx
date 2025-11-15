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
import { useQuery } from '@tanstack/react-query';
import { fetchUserComments } from '../../api';

function UserComments() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const {
    data: comments,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['userComments', userId],
    queryFn: () => fetchUserComments(userId),
    enabled: !!userId,
  });

  if (isLoading) return <div>Loading information...</div>;
  if (isError) return <div>Error with loading user: {error.message}</div>;

  if (!comments || comments.length === 0) {
    return <Typography>No comments authored by this user.</Typography>;
  }

  return (
    <List>
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
