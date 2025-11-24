import React from "react";
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import useZustandStore from "../../zustandStore";
import { fetchUserComments } from "../../api";

export default function UserComments() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const setSelectedUserId = useZustandStore((s) => s.setSelectedUserId);
  const setSelectedPhotoId = useZustandStore((s) => s.setSelectedPhotoId);

  // React Query fetch
  const {
    data: comments = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["userComments", userId],
    queryFn: () => fetchUserComments(userId),
  });

  if (isLoading) return <div>Loading information...</div>;
  if (isError) return <div>Error loading comments: {error.message}</div>;

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
            setSelectedUserId(comment.photoUserId);
            setSelectedPhotoId(comment.photoId);
            navigate(`/photos/${comment.photoUserId}/${comment.photoId}`);
          }}
          alignItems="flex-start"
        >
          <ListItemAvatar>
            <Avatar
              variant="rounded"
              src={`http://localhost:3001/images/${comment.photoUrl}`}
              sx={{ width: 80, height: 80, marginRight: 2 }}
            />
          </ListItemAvatar>

          <ListItemText primary={comment.comment} />
        </ListItem>
      ))}
    </List>
  );
}
