import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, FormControlLabel, Switch } from '@mui/material';
import { useLocation } from 'react-router-dom';
import axios from "axios";
import './styles.css';

// NEW: import zustand store
import useZustandStore from "../../zustandStore";

function TopBar() {

  const location = useLocation();
  const [userName, setUserName] = useState('');

  // NEW: get global state instead of props
  const advancedFeaturesEnabled = useZustandStore((s) => s.advancedFeaturesEnabled);
  const setAdvancedFeaturesEnabled = useZustandStore((s) => s.setAdvancedFeaturesEnabled);

  // extract userId from the relative URL using useLocation()
  let userId = null;
  if (location.pathname.startsWith('/users/')) {
    userId = location.pathname.split('/users/')[1];
  } else if (location.pathname.startsWith('/photos/')) {
    // when photoId migth be in the URL
    const parts = location.pathname.split('/photos/')[1];
    userId = parts ? parts.split('/')[0] : null;
  }

  const isPhotosView = location.pathname.includes('/photos/');
  // console.log("The userID is: " + userId)

  // call the user data from server
  useEffect(() => {
    if (userId) {
      axios
        .get(`http://localhost:3001/user/${userId}`)
        .then((res) => {
          setUserName(`${res.data.first_name} ${res.data.last_name}`);
        })
        .catch((err) => {
          console.error('Error fetching user in TopBar:', err);
          setUserName('User'); // placeholder name
        });
    } else {
      setUserName(''); // no user selected
    }
  }, [userId]);

  /*
  Returns my name on the left, middle is the user information
  Right is Adv Features toggle switch
  */
  return (
    <AppBar className="topbar-appBar" position="absolute">
      <Toolbar style={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h5" color="inherit">
          Haniyyah Hamid
        </Typography>
        <Typography variant="h5" color="inherit">
          {userName ? (isPhotosView ? `Photos of ${userName}` : userName) : "PhotoShare App"}
        </Typography>
        {/* when advancedFeaturesEnabled = true */}
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

export default TopBar;