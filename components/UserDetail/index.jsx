import React, { useEffect, useState } from 'react';
import { Typography, Button, Box } from '@mui/material';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUserById, deleteUser } from "../../api";

import './styles.css';
import ConfirmDialog from '../ConfirmDialog';
import useZustandStore from '../../zustandStore';

function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Get current user from Zustand
  const currentUser = useZustandStore((state) => state.currentUser);
  const resetStore = useZustandStore((state) => state.resetStore);
  const setSelectedUserId = useZustandStore((s) => s.setSelectedUserId);

  // State for confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Check if viewing own profile
  const isOwnProfile = currentUser && currentUser._id === userId;

  useEffect(() => {
    if (userId) {
      setSelectedUserId(userId);
    }
  }, [userId, setSelectedUserId]);

  // Fetch user data
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

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: () => deleteUser(userId),
    onSuccess: () => {
      // Clear all state and redirect to login
      resetStore();
      queryClient.clear();
      navigate('/login-register');
    },
    onError: (err) => {
      console.error('Error deleting account:', err);
      alert('Failed to delete account. Please try again.');
    }
  });

  const handleDeleteAccount = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    setDeleteDialogOpen(false);
    deleteUserMutation.mutate();
  };

  if (isLoading) return <div>Loading information...</div>;
  if (isError) return <div>Error with loading user: {error.message}</div>;

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

      <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
            onClick={handleDeleteAccount}
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
        onConfirm={handleConfirmDelete}
        title="Delete Account?"
        message="Are you sure you want to delete your account? This will permanently delete all your photos, comments, and account information. This action cannot be undone."
      />
    </div>
  );
}

export default UserDetail;