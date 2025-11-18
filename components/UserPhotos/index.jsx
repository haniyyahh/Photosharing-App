import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Typography, Grid, Card, CardMedia, Box, Button } from '@mui/material';
import axios from "axios";
import {
  NavigateBefore,
  NavigateNext
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';

import useZustandStore from "../../zustandStore";
import './styles.css';

function UserPhotos({ userId, photoId = null }) {
  const navigate = useNavigate();

  // pull global state from Zustand
  const advancedFeaturesEnabled = useZustandStore(s => s.advancedFeaturesEnabled);

  const [userPhotos, setUserPhotos] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/photosOfUser/${userId}`);
        setUserPhotos(response.data);

        if (photoId && response.data) {
          const index = response.data.findIndex(p => p._id === photoId);
          if (index !== -1) setCurrentPhotoIndex(index);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [userId, photoId]);

  useEffect(() => {
    if (advancedFeaturesEnabled && userPhotos.length > 0) {
      const currentPhoto = userPhotos[currentPhotoIndex];
      if (currentPhoto) {
        navigate(`/photos/${userId}/${currentPhoto._id}`, { replace: true });
      }
    }
  }, [currentPhotoIndex, advancedFeaturesEnabled, userPhotos, userId, navigate]);

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

  if (loading) return <div>Loading information...</div>;
  if (error) return <div>Error with loading user: {error.message}</div>;

  // 🔥 ADVANCED MODE
  if (advancedFeaturesEnabled) {
    const photo = userPhotos[currentPhotoIndex];

    return (
      <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
        <Box 
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
          sx={{ backgroundColor: '#f5f5f5', padding: 2, borderRadius: 1 }}
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

        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', px: 1 }}>
          <Card sx={{ maxWidth: '900px', width: '100%' }}>
            <CardMedia
              component="img"
              image={`/images/${photo.file_name}`}
              alt={`Photo ${photo._id}`}
              sx={{
                width: '100%',
                height: 'auto',
                maxHeight: '600px',
                objectFit: 'contain'
              }}
            />

            <Box sx={{ padding: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Taken: {new Date(photo.date_time).toLocaleString()}
              </Typography>

              <Typography variant="h6" sx={{ marginTop: 2, marginBottom: 1 }}>
                Comments:
              </Typography>

              {photo.comments?.length > 0 ? (
                photo.comments.map((c) => (
                  <Box
                    key={c._id}
                    sx={{
                      marginTop: 1.5,
                      padding: 1.5,
                      backgroundColor: "#f9f9f9",
                      borderRadius: 1,
                      wordWrap: 'break-word'
                    }}
                  >
                    <Typography variant="body2">
                      <Link
                        to={`/users/${c.user._id}`}
                        style={{ textDecoration: 'none', color: '#1976d2' }}
                      >
                        <strong>{c.user.first_name} {c.user.last_name}</strong>
                      </Link>
                      : {c.comment}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(c.date_time).toLocaleString()}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No comments
                </Typography>
              )}
            </Box>
          </Card>
        </Box>

      </Box>
    );
  }

  // default mode
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
                        style={{ textDecoration: 'none', color: '#1976d2' }}
                      >
                        <strong>{c.user.first_name} {c.user.last_name}</strong>
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

UserPhotos.propTypes = {
  userId: PropTypes.string.isRequired,
  photoId: PropTypes.string
};


export default UserPhotos;
