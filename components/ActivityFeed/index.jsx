import React, { useEffect } from 'react';
import {
  Typography,
  Card,
  CardContent,
  Box,
  Avatar,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  PhotoCamera,
  Comment,
  PersonAdd,
  Login,
  Logout,
  Refresh,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchActivities } from '../../api';
import socket from '../../socket';
import './styles.css';

/**
 * Activity Feed Component with Real-Time Socket.IO Updates
 * Displays the 5 most recent activities on the site
 */
function ActivityFeed() {
  const queryClient = useQueryClient();

  const {
    data: activities = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['activities'],
    queryFn: fetchActivities,
    // No refetchInterval needed - Socket.IO handles real-time updates!
  });

  // Socket.IO real-time listener
  useEffect(() => {
    console.log('ActivityFeed: Setting up socket listener');

    const handleNewActivity = (newActivity) => {
      console.log('New activity received:', newActivity);

      // Update the query cache with the new activity
      queryClient.setQueryData(['activities'], (oldActivities = []) => {
        // Add new activity to the front and keep only top 5
        const updatedActivities = [newActivity, ...oldActivities].slice(0, 5);
        return updatedActivities;
      });
    };

    // Listen for new activities
    socket.on('new_activity', handleNewActivity);

    // Cleanup on unmount
    return () => {
      console.log('ActivityFeed: Cleaning up socket listener');
      socket.off('new_activity', handleNewActivity);
    };
  }, [queryClient]);

  // Get icon and text for activity type
  const getActivityInfo = (activity) => {
    switch (activity.activity_type) {
      case 'PHOTO_UPLOAD':
        return {
          icon: <PhotoCamera sx={{ color: '#1976d2' }} />,
          text: 'uploaded a photo',
          showThumbnail: true,
        };
      case 'COMMENT_ADDED':
        return {
          icon: <Comment sx={{ color: '#2e7d32' }} />,
          text: 'commented on a photo',
          showThumbnail: true,
        };
      case 'USER_REGISTER':
        return {
          icon: <PersonAdd sx={{ color: '#9c27b0' }} />,
          text: 'registered an account',
          showThumbnail: false,
        };
      case 'USER_LOGIN':
        return {
          icon: <Login sx={{ color: '#ed6c02' }} />,
          text: 'logged in',
          showThumbnail: false,
        };
      case 'USER_LOGOUT':
        return {
          icon: <Logout sx={{ color: '#d32f2f' }} />,
          text: 'logged out',
          showThumbnail: false,
        };
      default:
        return {
          icon: null,
          text: 'performed an action',
          showThumbnail: false,
        };
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography color="error">
          Error loading activities: {error?.message || 'Unknown error'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Recent Activities
        </Typography>
        <Button
          variant="outlined"
          startIcon={isFetching ? <CircularProgress size={20} /> : <Refresh />}
          onClick={handleRefresh}
          disabled={isFetching}
        >
          Refresh
        </Button>
      </Box>

      {activities.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="textSecondary" align="center">
              No activities yet. Be the first to do something!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        activities.map((activity) => {
          const activityInfo = getActivityInfo(activity);

          return (
            <Card key={activity._id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  {/* Activity Icon */}
                  <Avatar sx={{ bgcolor: 'transparent', border: '2px solid #e0e0e0' }}>
                    {activityInfo.icon}
                  </Avatar>

                  {/* Activity Details */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ mb: 0.5 }}>
                      {activity.user ? (
                        <Link
                          to={`/users/${activity.user._id}`}
                          style={{ textDecoration: 'none', color: '#1976d2', fontWeight: 'bold' }}
                        >
                          {activity.user.first_name} {activity.user.last_name}
                        </Link>
                      ) : (
                        <span style={{ fontWeight: 'bold' }}>Unknown User</span>
                      )}{' '}
                      {activityInfo.text}
                    </Typography>

                    <Typography variant="caption" color="textSecondary">
                      {new Date(activity.date_time).toLocaleString()}
                    </Typography>
                  </Box>

                  {/* Photo Thumbnail (for photo uploads and comments) */}
                  {activityInfo.showThumbnail &&
                    activity.file_name &&
                    activity.photo_id &&
                    activity.photo_owner_id && (
                      <Link to={`/photos/${activity.photo_owner_id}/${activity.photo_id}`}>
                        <Box
                          component="img"
                          src={`/images/${activity.file_name}`}
                          alt="Activity thumbnail"
                          sx={{
                            width: 80,
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: 1,
                            cursor: 'pointer',
                            '&:hover': { opacity: 0.8 },
                          }}
                        />
                      </Link>
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })
      )}

      <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 3 }}>
        Showing the 5 most recent activities • Updates in real-time via Socket.IO
      </Typography>
    </Box>
  );
}

export default ActivityFeed;