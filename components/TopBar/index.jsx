import React from 'react';
import PropTypes from 'prop-types';
import { AppBar, Toolbar, Typography, FormControlLabel, Switch } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import './styles.css';

function TopBar({ advancedFeaturesEnabled, setAdvancedFeaturesEnabled }) {
  const location = useLocation();

  // Extract userId from the relative URL
  let userId = null;
  if (location.pathname.startsWith('/users/')) {
    userId = location.pathname.split('/users/')[1];
  } else if (location.pathname.startsWith('/photos/')) {
    const parts = location.pathname.split('/photos/')[1];
    userId = parts ? parts.split('/')[0] : null;
  }

  const isPhotosView = location.pathname.includes('/photos/');

  // Fetch user data with React Query
const { data: userData, isLoading, isError } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => axios.get(`http://localhost:3001/user/${userId}`).then(res => res.data),
    enabled: !!userId,
  });

  // Compute display name
  let userName = '';
  if (isLoading) {
    userName = 'Loading...';
  } else if (isError) {
    userName = 'User';
  } else if (userData) {
    userName = `${userData.first_name} ${userData.last_name}`;
  }

  return (
    <AppBar className="topbar-appBar" position="absolute">
      <Toolbar style={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h5" color="inherit">
          Haniyyah Hamid & Clowie G
        </Typography>
        <Typography variant="h5" color="inherit">
          {userName ? (isPhotosView ? `Photos of ${userName}` : userName) : "PhotoShare App"}
        </Typography>
        <FormControlLabel
          control={(
            <Switch
              checked={advancedFeaturesEnabled}
              onChange={(e) => setAdvancedFeaturesEnabled(e.target.checked)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: 'white',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                },
              }}
            />
          )}
          label={(
            <Typography variant="body2" sx={{ color: 'white', fontSize: '0.85rem' }}>
              Enable Advanced Features
            </Typography>
          )}
        />
      </Toolbar>
    </AppBar>
  );
}

TopBar.propTypes = {
  advancedFeaturesEnabled: PropTypes.bool.isRequired,
  setAdvancedFeaturesEnabled: PropTypes.func.isRequired,
};

export default TopBar;
