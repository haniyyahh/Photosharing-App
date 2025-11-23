import React, { useEffect } from 'react';
import { Typography, Button } from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from "@tanstack/react-query";
import { fetchUserById } from "../../api"; // api/index.js

import './styles.css';

// Zustand store
import useZustandStore from '../../zustandStore';

function UserDetail() {
  // Get userId from URL instead of props
  const { userId } = useParams();

  // Sync state to Zustand
  const setSelectedUserId = useZustandStore((s) => s.setSelectedUserId);

  // Keep global state updated when URL changes
  useEffect(() => {
    if (userId) {
      setSelectedUserId(userId);
    }
  }, [userId, setSelectedUserId]);

  // React Query replaces axios + useEffect
  const {
    data: user,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["user", userId],      
    queryFn: () => fetchUserById(userId),
    enabled: !!userId, // only fetch if userId exists
  });

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

      <Button variant="contained" component={Link} to={`/photos/${userId}`} sx={{ mt: 2 }}>
        View Photos
      </Button>
    </div>
  );
}

export default UserDetail;