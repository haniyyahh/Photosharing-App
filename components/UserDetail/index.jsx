import React, { useEffect, useState } from 'react';
import { Typography, Button, Box } from '@mui/material';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUserById, fetchUserStats, deleteUser } from "../../api";

import './styles.css';
import ConfirmDialog from '../ConfirmDialog';
import useZustandStore from '../../zustandStore';

function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Zustand
  const currentUser = useZustandStore((state) => state.currentUser);
  const resetStore = useZustandStore((state) => state.resetStore);
  const setSelectedUserId = useZustandStore((s) => s.setSelectedUserId);
  const setSelectedPhotoId = useZustandStore((s) => s.setSelectedPhotoId);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const isOwnProfile = currentUser && currentUser._id === userId;

  const setAdvancedFeaturesEnabled = useZustandStore(
    (s) => s.setAdvancedFeaturesEnabled
  );

  useEffect(() => {
    if (userId) {
      setSelectedUserId(userId);
    }
  }, [userId, setSelectedUserId]);

  // Fetch user info
  const {
    data: user,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUserById(userId),
    enabled: !!userId,
  });

  // Fetch user stats
  const {
    data: stats,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ["userStats", userId],
    queryFn: () => fetchUserStats(userId),
    enabled: !!userId,
  });

  // Delete user
  const deleteUserMutation = useMutation({
    mutationFn: () => deleteUser(userId),
    onSuccess: () => {
      resetStore();
      queryClient.clear();
      navigate('/login-register');
    },
    onError: (err) => {
      console.error('Error deleting account:', err);
      // eslint-disable-next-line no-alert
      alert('Failed to delete account. Please try again.');
    }
  });

  if (isLoading) return <div>Loading information...</div>;
  if (isError) return <div>Error loading user: {error.message}</div>;

  return (
    <div>
      <Typography variant="h5">
        {user?.first_name || "N/A"} {user?.last_name || ""}
      </Typography>

      <Typography variant="body1">
        <strong>Location:</strong> {user?.location || "N/A"}
      </Typography>

      <Typography variant="body1">
        <strong>Occupation:</strong> {user?.occupation || "N/A"}
      </Typography>

      <Typography variant="body1">
        <strong>Description:</strong> {user?.description || "N/A"}
      </Typography>

      {/* ===== USER PHOTO STATS ===== */}
      {!statsLoading && stats && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6">Photo Stats</Typography>

          <Box sx={{ display: 'flex', gap: 4, mt: 2, flexWrap: 'wrap' }}>
            {/* Most Recent Photo */}
            {stats.mostRecentPhoto && (
              <Box>
                <Typography variant="subtitle1">Most Recent Photo</Typography>
                <Box
                  component="img"
                  src={`http://localhost:3001/images/${stats.mostRecentPhoto.file_name}`}
                  alt="Most recent"
                  sx={{
                    width: 120,
                    height: 120,
                    objectFit: "cover",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setSelectedUserId(userId);
                    setSelectedPhotoId(stats.mostRecentPhoto._id);
                    setAdvancedFeaturesEnabled(true);
                    navigate(`/photos/${userId}/${stats.mostRecentPhoto._id}`);
                  }}
                />
                <Typography variant="body2">
                  Uploaded:{" "}
                  {new Date(stats.mostRecentPhoto.date_time).toLocaleString()}
                </Typography>
              </Box>
            )}

            {/* Most Commented Photo */}
            {stats.mostCommentedPhoto && (
              <Box>
                <Typography variant="subtitle1">Most Commented Photo</Typography>
                <Box
                  component="img"
                  src={`http://localhost:3001/images/${stats.mostCommentedPhoto.file_name}`}
                  alt="Most commented"
                  sx={{
                    width: 120,
                    height: 120,
                    objectFit: "cover",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setSelectedUserId(userId);
                    setSelectedPhotoId(stats.mostCommentedPhoto._id);
                    setAdvancedFeaturesEnabled(true);
                    navigate(`/photos/${userId}/${stats.mostCommentedPhoto._id}`);
                  }}
                />
                <Typography variant="body2">
                  Comments: {stats.mostCommentedPhoto.comment_count}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* ===== ACTION BUTTONS ===== */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          component={Link}
          to={`/photos/${userId}`}
        >
          View Photos
        </Button>

        {isOwnProfile && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleteUserMutation.isPending}
          >
            {deleteUserMutation.isPending ? 'Deleting...' : 'Delete Account'}
          </Button>
        )}
      </Box>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          setDeleteDialogOpen(false);
          deleteUserMutation.mutate();
        }}
        title="Delete Account?"
        message="Are you sure you want to delete your account? This will permanently delete all your photos, comments, and account information. This action cannot be undone."
      />
    </div>
  );
}

export default UserDetail;