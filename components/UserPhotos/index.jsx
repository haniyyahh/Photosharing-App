import React, { useState, useEffect } from "react";
import {
  Typography,
  Grid,
  Card,
  CardMedia,
  Box,
  Button,
  TextField,
} from "@mui/material";
import { NavigateBefore, NavigateNext } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPhotosByUser, addCommentToPhoto } from "../../api";

import useZustandStore from "../../zustandStore";
import "./styles.css";

function UserPhotos({ userId, photoId = null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Zustand global state
  const advancedFeaturesEnabled = useZustandStore(
    (s) => s.advancedFeaturesEnabled
  );

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [newComment, setNewComment] = useState("");
  const initialized = React.useRef(false);

  // React Query fetch
  const {
    data: userPhotos = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["photosOfUser", userId],
    queryFn: () => fetchPhotosByUser(userId),
    enabled: !!userId,
  });

  // React Query mutation to ADD comment
  const commentMutation = useMutation({
    mutationFn: ({ photo_id, comment }) => addCommentToPhoto(photo_id, comment),
    onSuccess: () => {
      // Refetch photos to show new comment
      queryClient.invalidateQueries(["photosOfUser", userId]);
      setNewComment(""); // Clear input
    },
  });

  // Initialize index when photos load + photoId provided
  useEffect(() => {
    if (!initialized.current && photoId && userPhotos.length > 0) {
      const idx = userPhotos.findIndex((p) => p._id === photoId);
      if (idx !== -1) setCurrentPhotoIndex(idx);
      initialized.current = true;
    }
  }, [photoId, userPhotos]);

  // Sync URL (advanced mode only)
  useEffect(() => {
    if (advancedFeaturesEnabled && userPhotos.length > 0) {
      const currentPhoto = userPhotos[currentPhotoIndex];
      if (currentPhoto) {
        const newUrl = `/photos/${userId}/${currentPhoto._id}`;
        if (window.location.pathname !== newUrl) {
          navigate(newUrl, { replace: true });
        }
      }
    }
  }, [
    currentPhotoIndex,
    advancedFeaturesEnabled,
    userPhotos,
    userId,
    navigate,
  ]);

  const handlePrevious = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentPhotoIndex < userPhotos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const photo = userPhotos[currentPhotoIndex];

    commentMutation.mutate({
      photo_id: photo._id,
      comment: newComment.trim(),
    });
  };

  // Loading & error states
  if (isLoading) return <div>Loading photos...</div>;
  if (isError) return <div>Error loading photos: {error.message}</div>;

  // ADVANCED MODE (with comment input UI)
  if (advancedFeaturesEnabled) {
    const photo = userPhotos[currentPhotoIndex];

    return (
      <Box sx={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
          sx={{ backgroundColor: "#f5f5f5", padding: 2, borderRadius: 1 }}
        >
          <Button
            variant="contained"
            startIcon={<NavigateBefore />}
            onClick={handlePrevious}
            disabled={currentPhotoIndex === 0}
          >
            Previous
          </Button>

          <Typography variant="h6">
            Photo {currentPhotoIndex + 1} of {userPhotos.length}
          </Typography>

          <Button
            variant="contained"
            endIcon={<NavigateNext />}
            onClick={handleNext}
            disabled={currentPhotoIndex === userPhotos.length - 1}
          >
            Next
          </Button>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center", px: 1 }}>
          <Card sx={{ maxWidth: "900px", width: "100%" }}>
            <CardMedia
              component="img"
              image={`/images/${photo.file_name}`}
              alt={`Photo ${photo._id}`}
              sx={{
                width: "100%",
                height: "auto",
                maxHeight: "600px",
                objectFit: "contain",
              }}
            />

            <Box sx={{ padding: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Taken: {new Date(photo.date_time).toLocaleString()}
              </Typography>

              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Comments:
              </Typography>

              {photo.comments?.length > 0 ? (
                photo.comments.map((c) => (
                  <div key={c._id} style={{ marginTop: "6px" }}>
                    <Typography variant="body2">
                      <Link
                        to={`/users/${c.user._id}`}
                        style={{ textDecoration: "none", color: "#1976d2" }}
                      >
                        <strong>
                          {c.user.first_name} {c.user.last_name}
                        </strong>
                      </Link>
                      : {c.comment}
                    </Typography>

                    <Typography variant="caption" color="textSecondary">
                      {new Date(c.date_time).toLocaleString()}
                    </Typography>
                  </div>
                ))
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No comments
                </Typography>
              )}

              {/* NEW COMMENT INPUT FIELD */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Add a Comment
                </Typography>

                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write something..."
                />

                <Button
                  variant="contained"
                  sx={{ mt: 1.5 }}
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || commentMutation.isLoading}
                >
                  {commentMutation.isLoading ? "Posting..." : "Add Comment"}
                </Button>
              </Box>
            </Box>
          </Card>
        </Box>
      </Box>
    );
  }

  // NON-ADVANCED MODE
  return (
    <Grid container spacing={2}>
      {userPhotos.map((photo) => (
        <Grid item xs={12} sm={6} md={4} key={photo._id}>
          <Card>
            <CardMedia
              component="img"
              image={`/images/${photo.file_name}`}
              alt={`Photo ${photo._id}`}
            />

            <div style={{ padding: "8px" }}>
              <Typography variant="body2" color="textSecondary">
                Taken: {new Date(photo.date_time).toLocaleString()}
              </Typography>

              {photo.comments?.length > 0 ? (
                photo.comments.map((c) => (
                  <div key={c._id} style={{ marginTop: "6px" }}>
                    <Typography variant="body2">
                      <Link
                        to={`/users/${c.user._id}`}
                        style={{ textDecoration: "none", color: "#1976d2" }}
                      >
                        <strong>
                          {c.user.first_name} {c.user.last_name}
                        </strong>
                      </Link>
                      : {c.comment}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(c.date_time).toLocaleString()}
                    </Typography>
                  </div>
                ))
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No comments
                </Typography>
              )}
            </div>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export default UserPhotos;