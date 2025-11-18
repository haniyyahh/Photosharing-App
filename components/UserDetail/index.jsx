import React, { useState, useEffect } from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import PropTypes from 'prop-types';
import { Typography, Button } from '@mui/material';
import axios from "axios";
import { Link, useParams } from 'react-router-dom';

import './styles.css';

// NEW: import Zustand store
import useZustandStore from '../../zustandStore';

function UserDetail() {
  // NEW: read userId from the route instead of props
  const { userId } = useParams();

  // NEW: Zustand setter to sync global state
  const setSelectedUserId = useZustandStore((s) => s.setSelectedUserId);

  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // sync Zustand-selected user whenever URL changes
  useEffect(() => {
    if (userId) {
      setSelectedUserId(userId);
    }
  }, [userId, setSelectedUserId]);

  // get user information from server
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/user/${userId}`);
        setUser(response.data);
      } catch (err) {
        console.error("Error fetching user:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  // Error handling: display messages based on the states defined above
  if (loading) return <div>Loading information...</div>;
  if (error) return <div>Error with loading user: {error.message}</div>;

  /*
  Returns all information about the user, if available.
  A button that links to the photos associated with current user.
  Uses material UI design: margin-top is defined for the button
  */
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

// PropTypes no longer needed since we removed props, but keeping for compatibility
UserDetail.propTypes = {
  userId: PropTypes.string,
};

export default UserDetail;