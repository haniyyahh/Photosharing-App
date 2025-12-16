import React, { useState, useEffect, useRef } from "react";
import {
  Typography,
  Grid,
  Card,
  CardMedia,
  Box,
  Button,
  TextField,
  IconButton,
} from "@mui/material";
import { NavigateBefore, NavigateNext, Delete } from "@mui/icons-material";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPhotosByUser,
  addCommentToPhoto,
  likePhoto,
  deletePhoto,
  deleteComment,
} from "../../api";

import useZustandStore from "../../zustandStore";
import ConfirmDialog from "../ConfirmDialog";
import "./styles.css";

import socket from "../../socket";

function UserPhotos({ userId }) {
  const { photoId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Zustand global state
  const advancedFeaturesEnabled = useZustandStore(
    (s) => s.advancedFeaturesEnabled
  );
  const loggedInUser = useZustandStore((s) => s.currentUser);

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [newComment, setNewComment] = useState("");
  const hasInitialized = useRef(false);

  // Delete confirmation state
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [commentToDelete, setCommentToDelete] = useState(null);

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

  // Sort photos
  const sortedPhotos = [...userPhotos].sort((a, b) => {
    const likesDiff = (b.likes?.length || 0) - (a.likes?.length || 0);
    if (likesDiff !== 0) return likesDiff;
    return new Date(b.date_time) - new Date(a.date_time);
  });

  // React Query mutation to ADD comment
  const commentMutation = useMutation({
    mutationFn: ({ photo_id, comment }) => addCommentToPhoto(photo_id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries(["photosOfUser", userId]);
      setNewComment("");
    },
  });

  // React Query mutation to LIKE photo with OPTIMISTIC UPDATES
  const likeMutation = useMutation({
    mutationFn: (targetPhotoId) => likePhoto(targetPhotoId),
    
    // Optimistically update the UI before the server responds
    onMutate: async (targetPhotoId) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries(["photosOfUser", userId]);

      // Snapshot the previous value
      const previousPhotos = queryClient.getQueryData(["photosOfUser", userId]);

      // Optimistically update the cache
      queryClient.setQueryData(["photosOfUser", userId], (old) => {
        if (!old) return old;
        
        return old.map((photo) => {
          if (photo._id === targetPhotoId) {
            const isLiked = photo.likes?.includes(loggedInUser?._id);
            
            return {
              ...photo,
              likes: isLiked
                ? photo.likes.filter((id) => id !== loggedInUser._id) // Unlike
                : [...(photo.likes || []), loggedInUser._id], // Like
            };
          }
          return photo;
        });
      });

      // Return context with previous value for potential rollback
      return { previousPhotos };
    },

    // If mutation fails, rollback to previous state
    onError: (err, targetPhotoId, context) => {
      if (context?.previousPhotos) {
        queryClient.setQueryData(["photosOfUser", userId], context.previousPhotos);
      }
      console.error('Like mutation failed:', err);
      // eslint-disable-next-line no-alert
      alert('Failed to update like. Please try again.');
    },

    // Always refetch after error or success to ensure data consistency
    onSettled: () => {
      queryClient.invalidateQueries(["photosOfUser", userId]);
    },
  });

  // DELETE PHOTO mutation
  const deletePhotoMutation = useMutation({
    mutationFn: ({ commentId, photoId }) => deleteComment(commentId, photoId),
    onSuccess: () => {
      queryClient.invalidateQueries(["photosOfUser", userId]);
      setPhotoToDelete(null);
      
      // If in advanced mode and deleted current photo, adjust index
      if (advancedFeaturesEnabled && sortedPhotos.length > 1) {
        if (currentPhotoIndex >= sortedPhotos.length - 1) {
          setCurrentPhotoIndex(Math.max(0, currentPhotoIndex - 1));
        }
      }
    },
    onError: (err) => {
      console.error('Error deleting photo:', err);
      // eslint-disable-next-line no-alert
      alert('Failed to delete photo. Please try again.');
    }
  });

  // DELETE COMMENT mutation
  const deleteCommentMutation = useMutation({
    mutationFn: ({ commentId, targetPhotoId }) => deleteComment(commentId, targetPhotoId),
    onSuccess: () => {
      queryClient.invalidateQueries(["photosOfUser", userId]);
      setCommentToDelete(null);
    },
    onError: (err) => {
      console.error('Error deleting comment:', err);
      // eslint-disable-next-line no-alert
      alert('Failed to delete comment. Please try again.');
    }
  });

  // Initialize index based on URL photoId - ONLY ONCE when component mounts or photoId changes
  useEffect(() => {
    if (sortedPhotos.length > 0) {
      if (!photoId) {
        // No photoId in URL - reset to first photo
        setCurrentPhotoIndex(0);
        hasInitialized.current = true;
      } else if (!hasInitialized.current || photoId) {
        // Find specific photo by ID
        const idx = sortedPhotos.findIndex((p) => p._id === photoId);
        if (idx !== -1) {
          setCurrentPhotoIndex(idx);
        } else {
          setCurrentPhotoIndex(0);
        }
        hasInitialized.current = true;
      }
    }
  }, [photoId, sortedPhotos.length]);

  // Reset hasInitialized when userId changes (navigating to different user)
  useEffect(() => {
    hasInitialized.current = false;
  }, [userId]);

  // Sync URL when index changes in advanced mode
  useEffect(() => {
    if (advancedFeaturesEnabled && sortedPhotos.length > 0 && hasInitialized.current) {
      const currentPhoto = sortedPhotos[currentPhotoIndex];
      if (currentPhoto) {
        const newUrl = `/photos/${userId}/${currentPhoto._id}`;
        if (window.location.pathname !== newUrl) {
          navigate(newUrl, { replace: true });
        }
      }
    }
  }, [currentPhotoIndex, advancedFeaturesEnabled, sortedPhotos.length, userId, navigate]);

  // Socket listener for photo likes updates (with debouncing to prevent rapid refetches)
  useEffect(() => {
    let timeoutId;
    
    const handleLikesUpdate = (data) => {
      // Debounce: only invalidate after 300ms of no updates
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Only invalidate if we have data about which photo was updated
        if (data?.photoId) {
          const photoExists = sortedPhotos.some(p => p._id === data.photoId);
          if (photoExists) {
            queryClient.invalidateQueries(["photosOfUser", userId]);
          }
        } else {
          // Fallback: invalidate all photos for this user if no specific photoId
          queryClient.invalidateQueries(["photosOfUser", userId]);
        }
      }, 300);
    };

    socket.on("photo_likes_updated", handleLikesUpdate);

    return () => {
      clearTimeout(timeoutId);
      socket.off("photo_likes_updated", handleLikesUpdate);
    };
  }, [queryClient, userId, sortedPhotos]);

  const handlePrevious = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentPhotoIndex < sortedPhotos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const photo = sortedPhotos[currentPhotoIndex];

    commentMutation.mutate({
      photo_id: photo._id,
      comment: newComment.trim(),
    });
  };

  // Delete handlers
  const handleDeletePhoto = (targetPhotoId) => {
    setPhotoToDelete(targetPhotoId);
  };

  const handleConfirmDeletePhoto = () => {
    if (photoToDelete) {
      deletePhotoMutation.mutate(photoToDelete);
    }
  };

  const handleDeleteComment = (commentId, targetPhotoId) => {
    setCommentToDelete({ commentId, photoId: targetPhotoId });
  };

  const handleConfirmDeleteComment = () => {
    if (commentToDelete) {
      deleteCommentMutation.mutate(commentToDelete);
    }
  };

  // Loading & error states
  if (isLoading) return <div>Loading photos...</div>;
  if (isError) return <div>Error loading photos: {error?.message || "Unknown error"}</div>;

  // Handle empty photo array
  if (!userPhotos || userPhotos.length === 0) {
    return <div>There are no photos for this user.</div>;
  }

  // ADVANCED MODE (with comment input UI)
  if (advancedFeaturesEnabled) {
    const photo = sortedPhotos[currentPhotoIndex];
    const isOwnPhoto = loggedInUser && photo.user_id === loggedInUser._id;
    const isPhotoLikedByCurrentUser = photo.likes?.includes(loggedInUser?._id);

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
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="body2" color="textSecondary">
                  Taken: {new Date(photo.date_time).toLocaleString()}
                </Typography>
                
                {/* Delete Photo Button - only show if user owns the photo */}
                {isOwnPhoto && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<Delete />}
                    onClick={() => handleDeletePhoto(photo._id)}
                    disabled={deletePhotoMutation.isPending}
                  >
                    Delete Photo
                  </Button>
                )}
              </Box>
            
              <Box sx={{ mt: 1, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  variant={isPhotoLikedByCurrentUser ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => likeMutation.mutate(photo._id)}
                  disabled={!loggedInUser || likeMutation.isPending}
                >
                  {isPhotoLikedByCurrentUser ? "Unlike" : "Like"}
                </Button>

                <Typography variant="body2" color="textSecondary">
                  {photo.likes?.length || 0} {photo.likes?.length === 1 ? 'like' : 'likes'}
                </Typography>
              </Box>

              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Comments:
              </Typography>

              {photo.comments?.length > 0 ? (
                photo.comments.map((c) => {
                  const isOwnComment = loggedInUser && c.user._id === loggedInUser._id;
                  
                  return (
                    <Box 
                      key={c._id} 
                      sx={{ 
                        marginTop: "6px", 
                        display: "flex", 
                        justifyContent: "space-between",
                        alignItems: "flex-start"
                      }}
                    >
                      <div style={{ flex: 1 }}>
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

                      {/* Delete Comment Button - only show if user owns the comment */}
                      {isOwnComment && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteComment(c._id, photo._id)}
                          disabled={deleteCommentMutation.isPending}
                          sx={{ ml: 1 }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  );
                })
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No comments
                </Typography>
              )}

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
                  disabled={!loggedInUser}
                />

                <Button
                  variant="contained"
                  sx={{ mt: 1.5 }}
                  onClick={handleAddComment}
                  disabled={!loggedInUser || !newComment.trim() || commentMutation.isPending}
                >
                  {commentMutation.isPending ? "Posting..." : "Add Comment"}
                </Button>
              </Box>
            </Box>
          </Card>
        </Box>

        {/* Confirmation Dialogs */}
        <ConfirmDialog
          open={!!photoToDelete}
          onClose={() => setPhotoToDelete(null)}
          onConfirm={handleConfirmDeletePhoto}
          title="Delete Photo?"
          message="Are you sure you want to delete this photo? All comments on this photo will also be deleted. This action cannot be undone."
        />

        <ConfirmDialog
          open={!!commentToDelete}
          onClose={() => setCommentToDelete(null)}
          onConfirm={handleConfirmDeleteComment}
          title="Delete Comment?"
          message="Are you sure you want to delete this comment? This action cannot be undone."
        />
      </Box>
    );
  }

  // NON-ADVANCED MODE
  return (
    <>
      <Grid container spacing={2}>
        {sortedPhotos.map((photo) => {
          const isOwnPhoto = loggedInUser && photo.user_id === loggedInUser._id;
          const isPhotoLikedByCurrentUser = photo.likes?.includes(loggedInUser?._id);
          
          return (
            <Grid item xs={12} sm={6} md={4} key={photo._id}>
              <Card>
                <CardMedia
                  component="img"
                  image={`/images/${photo.file_name}`}
                  alt={`Photo ${photo._id}`}
                />

                <div style={{ padding: "8px" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="textSecondary">
                      Taken: {new Date(photo.date_time).toLocaleString()}
                    </Typography>
                    
                    {/* Delete Photo Button - only show if user owns the photo */}
                    {isOwnPhoto && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeletePhoto(photo._id)}
                        disabled={deletePhotoMutation.isPending}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </Box>

                  <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
                    <Button
                      size="small"
                      variant={isPhotoLikedByCurrentUser ? "contained" : "outlined"}
                      onClick={() => likeMutation.mutate(photo._id)}
                      disabled={!loggedInUser || likeMutation.isPending}
                    >
                      {isPhotoLikedByCurrentUser ? "Unlike" : "Like"}
                    </Button>

                    <Typography variant="caption">
                      {photo.likes?.length || 0} {photo.likes?.length === 1 ? 'like' : 'likes'}
                    </Typography>
                  </Box>

                  {photo.comments?.length > 0 ? (
                    photo.comments.map((c) => {
                      const isOwnComment = loggedInUser && c.user._id === loggedInUser._id;
                      
                      return (
                        <Box 
                          key={c._id} 
                          sx={{ 
                            marginTop: "6px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start"
                          }}
                        >
                          <div style={{ flex: 1 }}>
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

                          {/* Delete Comment Button - only show if user owns the comment */}
                          {isOwnComment && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteComment(c._id, photo._id)}
                              disabled={deleteCommentMutation.isPending}
                              sx={{ ml: 0.5 }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      );
                    })
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No comments
                    </Typography>
                  )}
                </div>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={!!photoToDelete}
        onClose={() => setPhotoToDelete(null)}
        onConfirm={handleConfirmDeletePhoto}
        title="Delete Photo?"
        message="Are you sure you want to delete this photo? All comments on this photo will also be deleted. This action cannot be undone."
      />

      <ConfirmDialog
        open={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleConfirmDeleteComment}
        title="Delete Comment?"
        message="Are you sure you want to delete this comment? This action cannot be undone."
      />
    </>
  );
}

export default UserPhotos;