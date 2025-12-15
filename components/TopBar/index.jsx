// import React from 'react';
// import { AppBar, Toolbar, Typography, FormControlLabel, Switch, Button , Popover } from '@mui/material';
// import { useLocation, useNavigate } from 'react-router-dom';
// import { useQuery, useMutation } from '@tanstack/react-query';

// import axios from 'axios';
// import './styles.css';
// import AddPhoto from "../AddPhotos/AddPhotos";

// // Import zustand store and API functions
// import useZustandStore from "../../zustandStore";
// import { logoutUser } from '../../api';

// function TopBar() {
//   const location = useLocation();
//   const navigate = useNavigate();

//   // Get global state from Zustand
//   const advancedFeaturesEnabled = useZustandStore((s) => s.advancedFeaturesEnabled);
//   const setAdvancedFeaturesEnabled = useZustandStore((s) => s.setAdvancedFeaturesEnabled);
//   const currentUser = useZustandStore((state) => state.currentUser);
//   const resetStore = useZustandStore((state) => state.resetStore);
//   const showUpload = useZustandStore(s => s.showUpload);
//   const setShowUpload = useZustandStore(s => s.setShowUpload);

//   const userIsLoggedIn = currentUser !== null;

//   // Extract userId from the relative URL
//   let userId = null;
//   if (location.pathname.startsWith('/users/')) {
//     userId = location.pathname.split('/users/')[1];
//   } else if (location.pathname.startsWith('/photos/')) {
//     const parts = location.pathname.split('/photos/')[1];
//     userId = parts ? parts.split('/')[0] : null;
//   }

//   const isPhotosView = location.pathname.includes('/photos/');

//   // Fetch user data with React Query (only if logged in and userId exists)
//   const { data: userData, isLoading, isError } = useQuery({
//     queryKey: ['user', userId],
//     queryFn: () => api.get(`http://localhost:3001/user/${userId}`).then(res => res.data),
//     enabled: !!userId && userIsLoggedIn,
//   });

//   // Logout mutation
//   const logoutMutation = useMutation({
//     mutationFn: logoutUser,
//     onSuccess: () => {
//       resetStore(); // Clear all Zustand state
//       navigate('/login-register');
//     },
//     onError: (err) => {
//       console.error('Logout error:', err);
//       // Still clear local state even if server errors
//       resetStore();
//       navigate('/login-register');
//     }
//   });

//   const handleLogout = () => {
//     logoutMutation.mutate();
//   };

//   // Compute display name for center section
//   let centerText = '';
//   if (!userIsLoggedIn) {
//     centerText = 'PhotoShare App';
//   } else if (isLoading) {
//     centerText = 'Loading...';
//   } else if (isError) {
//     centerText = 'PhotoShare App';
//   } else if (userData) {
//     const userName = `${userData.first_name} ${userData.last_name}`;
//     centerText = isPhotosView ? `Photos of ${userName}` : userName;
//   } else {
//     centerText = 'PhotoShare App';
//   }

//   return (
//     <AppBar className="topbar-appBar" position="absolute">
//       <Toolbar style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//         {/* Left side - App name */}
//         <Typography variant="h5" color="inherit">
//           Haniyyah & Clowie
//         </Typography>

//         {/* Center - Context info */}
//         <Typography variant="h5" color="inherit">
//           {centerText}
//         </Typography>

//         {/* Right side - Login status and controls */}
//         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
//           {userIsLoggedIn ? (
//   <>
//     {/* Greeting */}
//     <Typography variant="body1" color="inherit" sx={{ marginRight: 1 }}>
//       Hi {currentUser.first_name}
//     </Typography>

//     {/* Add Photo Button */}
//     <Button 
//       variant="outlined"
//       color="inherit"
//       sx={{ 
//         textTransform: 'none',
//         border: '1px solid rgba(255,255,255,0.5)'
//       }}
//       onClick={(e) => setShowUpload(e.currentTarget)}
//     >
//       Add Photo
//     </Button>

//     {/* Upload Popover */}
//     <Popover
//       open={Boolean(showUpload)}
//       anchorEl={showUpload}
//       onClose={() => setShowUpload(null)}
//       anchorOrigin={{
//         vertical: "bottom",
//         horizontal: "right",
//       }}
//       transformOrigin={{
//         vertical: "top",
//         horizontal: "right",
//       }}
//       PaperProps={{
//         sx: { p: 2, width: 280 }
//       }}
//     >
//       <AddPhoto onFinish={() => setShowUpload(null)} />
//     </Popover>

//     {/* Logout */}
//     <Button 
//       color="inherit" 
//       onClick={handleLogout}
//       disabled={logoutMutation.isPending}
//       sx={{ textTransform: 'none', border: '1px solid rgba(255,255,255,0.5)' }}
//     >
//       {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
//     </Button>

//     {/* Advanced toggle */}
//     <FormControlLabel
//       control={(
//         <Switch
//           checked={advancedFeaturesEnabled}
//           onChange={(e) => setAdvancedFeaturesEnabled(e.target.checked)}
//           sx={{
//             '& .MuiSwitch-switchBase.Mui-checked': {
//               color: 'white',
//             },
//             '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
//               backgroundColor: 'rgba(255,255,255,0.7)',
//             },
//             '& .MuiSwitch-track': {
//               backgroundColor: 'rgba(255,255,255,0.3)',
//             }
//           }}
//         />
//       )}
//       label={<Typography variant="body2" color="white">Enable Advanced Features</Typography>}
//     />
//   </>
// ) : (
//   <Typography variant="body1" color="inherit">Please Login</Typography>
// )}

//         </div>
//       </Toolbar>
//     </AppBar>
//   );
// }

// export default TopBar;

import React from 'react';
import { AppBar, Toolbar, Typography, FormControlLabel, Switch, Button , Popover } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';

import axios from 'axios';
import './styles.css';
import AddPhoto from "../AddPhotos/AddPhotos";

// Import zustand store and API functions
import useZustandStore from "../../zustandStore";
import { logoutUser } from '../../api';

// Create axios instance with credentials
const api = axios.create({
  baseURL: 'http://localhost:3001',
  withCredentials: true  // This is crucial for sending cookies
});

function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get global state from Zustand
  const advancedFeaturesEnabled = useZustandStore((s) => s.advancedFeaturesEnabled);
  const setAdvancedFeaturesEnabled = useZustandStore((s) => s.setAdvancedFeaturesEnabled);
  const currentUser = useZustandStore((state) => state.currentUser);
  const resetStore = useZustandStore((state) => state.resetStore);
  const showUpload = useZustandStore(s => s.showUpload);
  const setShowUpload = useZustandStore(s => s.setShowUpload);

  const userIsLoggedIn = currentUser !== null;

  // Extract userId from the relative URL
  let userId = null;
  if (location.pathname.startsWith('/users/')) {
    userId = location.pathname.split('/users/')[1];
  } else if (location.pathname.startsWith('/photos/')) {
    const parts = location.pathname.split('/photos/')[1];
    userId = parts ? parts.split('/')[0] : null;
  }

  const isPhotosView = location.pathname.includes('/photos/');
  const isActivitiesView = location.pathname === '/activities';

  // Fetch user data with React Query (only if logged in and userId exists)
  const { data: userData, isLoading, isError } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.get(`/user/${userId}`).then(res => res.data),
    enabled: !!userId && userIsLoggedIn && !isActivitiesView,
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      resetStore(); // Clear all Zustand state
      navigate('/login-register');
    },
    onError: (err) => {
      console.error('Logout error:', err);
      // Still clear local state even if server errors
      resetStore();
      navigate('/login-register');
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Compute display name for center section
  let centerText = '';
  if (!userIsLoggedIn) {
    centerText = 'PhotoShare App';
  } else if (isActivitiesView) {
    centerText = 'Activity Feed';
  } else if (isLoading) {
    centerText = 'Loading...';
  } else if (isError) {
    centerText = 'PhotoShare App';
  } else if (userData) {
    const userName = `${userData.first_name} ${userData.last_name}`;
    centerText = isPhotosView ? `Photos of ${userName}` : userName;
  } else {
    centerText = 'PhotoShare App';
  }

  return (
    <AppBar className="topbar-appBar" position="absolute">
      <Toolbar style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {/* Left side - App name */}
        <Typography variant="h5" color="inherit">
          Haniyyah & Clowie
        </Typography>

        {/* Center - Context info */}
        <Typography variant="h5" color="inherit">
          {centerText}
        </Typography>

        {/* Right side - Login status and controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {userIsLoggedIn ? (
            <>
              {/* Greeting */}
              <Typography variant="body1" color="inherit" sx={{ marginRight: 1 }}>
                Hi {currentUser.first_name}
              </Typography>

              {/* Activities Button */}
              <Button 
                variant="outlined"
                color="inherit"
                sx={{ 
                  textTransform: 'none',
                  border: '1px solid rgba(255,255,255,0.5)'
                }}
                onClick={() => navigate('/activities')}
              >
                Activities
              </Button>

              {/* Add Photo Button */}
              <Button 
                variant="outlined"
                color="inherit"
                sx={{ 
                  textTransform: 'none',
                  border: '1px solid rgba(255,255,255,0.5)'
                }}
                onClick={(e) => setShowUpload(e.currentTarget)}
              >
                Add Photo
              </Button>

              {/* Upload Popover */}
              <Popover
                open={Boolean(showUpload)}
                anchorEl={showUpload}
                onClose={() => setShowUpload(null)}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                PaperProps={{
                  sx: { p: 2, width: 280 }
                }}
              >
                <AddPhoto onFinish={() => setShowUpload(null)} />
              </Popover>

              {/* Logout */}
              <Button 
                color="inherit" 
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                sx={{ textTransform: 'none', border: '1px solid rgba(255,255,255,0.5)' }}
              >
                {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
              </Button>

              {/* Advanced toggle */}
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
                        backgroundColor: 'rgba(255,255,255,0.7)',
                      },
                      '& .MuiSwitch-track': {
                        backgroundColor: 'rgba(255,255,255,0.3)',
                      }
                    }}
                  />
                )}
                label={<Typography variant="body2" color="white">Enable Advanced Features</Typography>}
              />
            </>
          ) : (
            <Typography variant="body1" color="inherit">Please Login</Typography>
          )}
        </div>
      </Toolbar>
    </AppBar>
  );
}

export default TopBar;