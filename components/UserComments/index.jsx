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
  const advancedFeaturesEnabled = useZustandStore((s) => s.advancedFeaturesEnabled);

  const {
    data: comments = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["userComments", userId],
    queryFn: () => fetchUserComments(userId),
    enabled: !!userId,
  });

  if (isLoading) return <div>Loading information...</div>;
  if (isError) return <div>Error loading comments: {error.message}</div>;

  if (comments.length === 0) {
    return <Typography>No comments authored by this user.</Typography>;
  }

  return (
    <List>
      {comments.map((comment, index) => {
        return (
          <ListItem
            key={`${comment.photoId}-${index}`}
            button
            alignItems="flex-start"
            onClick={() => {
              // Use photoUserId (photo owner) instead of userId (commenter)
              setSelectedUserId(comment.photoUserId);
              
              // Navigate with photoId in URL - works in advanced mode
              // In non-advanced mode, it will just show all photos
              if (advancedFeaturesEnabled) {
                navigate(`/photos/${comment.photoUserId}/${comment.photoId}`);
              } else {
                // In non-advanced mode, just go to the photos page
                // The specific photo will be visible in the grid
                navigate(`/photos/${comment.photoUserId}`);
              }
            }}
          >
            <ListItemAvatar>
              <Avatar
                variant="rounded"
                src={`http://localhost:3001/images/${comment.photoUrl}`}
                alt="commented photo"
                sx={{
                  width: 80,
                  height: 80,
                  mr: 2,
                }}
              />
            </ListItemAvatar>

            <ListItemText
              primary={comment.comment}
              secondary={new Date(comment.date_time).toLocaleString()}
            />
          </ListItem>
        );
      })}
    </List>
  );
}