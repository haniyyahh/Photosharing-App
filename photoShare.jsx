// import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import ReactDOM from 'react-dom/client';
import React from 'react';

import { Grid, Paper } from '@mui/material';
import {
  BrowserRouter,
  Route,
  Routes,
  useParams,
  Navigate
} from 'react-router-dom';

import './styles/main.css';

import TopBar from './components/TopBar';
import UserDetail from './components/UserDetail';
import UserList from './components/UserList';
import UserPhotos from './components/UserPhotos';
import UserComments from './components/UserComments';
import LoginRegister from './components/LoginRegister';

// Zustand store
import useZustandStore from "./zustandStore";

// React Query
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient();

// route wrappers

function UserDetailRoute() {
  const { userId } = useParams();
  return <UserDetail userId={userId} />;
}

function UserPhotosRoute() {
  const { userId, photoId } = useParams();
  const advancedFeaturesEnabled = useZustandStore((s) => s.advancedFeaturesEnabled);

  return (
    <UserPhotos
      userId={userId}
      photoId={photoId}
      advancedFeaturesEnabled={advancedFeaturesEnabled}
    />
  );
}

function RedirectToUserDetails() {
  const { userId } = useParams();
  return <Navigate to={`/users/${userId}`} replace />;
}

// main app

function PhotoShare() {
  console.log('=== PhotoShare CALLED ===');
  const advancedFeaturesEnabled = useZustandStore((s) => s.advancedFeaturesEnabled);
  const setAdvancedFeaturesEnabled = useZustandStore((s) => s.setAdvancedFeaturesEnabled);
  const currentUser = useZustandStore((state) => state.currentUser);
  
  console.log('=== PhotoShare Render ===');
  console.log('currentUser:', currentUser);
  console.log('currentUser type:', typeof currentUser);
  console.log('currentUser === null:', currentUser === null);
  console.log('currentUser !== null:', currentUser !== null);
  
  const userIsLoggedIn = currentUser !== null;
  console.log('userIsLoggedIn:', userIsLoggedIn);
  

  // Check if user is logged in
  // const userIsLoggedIn = currentUser !== null;

  return (
    <BrowserRouter>
      <div>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TopBar
              advancedFeaturesEnabled={advancedFeaturesEnabled}
              setAdvancedFeaturesEnabled={setAdvancedFeaturesEnabled}
            />
          </Grid>

          <div className="main-topbar-buffer" />

          {/* Sidebar - only show when logged in */}
          {userIsLoggedIn && (
            <Grid item sm={3}>
              <Paper className="main-grid-item">
                <UserList advancedFeaturesEnabled={advancedFeaturesEnabled} />
              </Paper>
            </Grid>
          )}

          {/* Main content area - adjust width based on login state */}
          <Grid item sm={userIsLoggedIn ? 9 : 12}>
            <Paper className="main-grid-item">
              <Routes>
                {/* Login/Register route */}
                <Route path="/login" element={<LoginRegister />} />

                {/* Conditional routes based on login status */}
                {userIsLoggedIn ? (
                  <Route path="/users/:userId" element={<UserDetailRoute />} />
                ) : (
                  <Route path="/users/:userId" element={<Navigate to="/login-register" replace />} />
                )}

                {userIsLoggedIn ? (
                  <Route path="/photos/:userId/:photoId?" element={<UserPhotosRoute />} />
                ) : (
                  <Route path="/photos/:userId/:photoId?" element={<Navigate to="/login-register" replace />} />
                )}

                {userIsLoggedIn ? (
                  <Route path="/users" element={<UserList advancedFeaturesEnabled={advancedFeaturesEnabled} />} />
                ) : (
                  <Route path="/users" element={<Navigate to="/login-register" replace />} />
                )}

                {/* Comments (advanced mode only) */}
                {userIsLoggedIn ? (
                  <Route
                    path="/comments/:userId"
                    element={
                      advancedFeaturesEnabled ? (
                        <UserCommentsRoute />
                      ) : (
                        <RedirectToUserDetails />
                      )
                    }
                  />
                ) : (
                  <Route path="/comments/:userId" element={<Navigate to="/login-register" replace />} />
                )}

                {/* Default route */}
                {userIsLoggedIn ? (
                  <Route path="/" element={<Navigate to={`/users/${currentUser._id}`} replace />} />
                ) : (
                  <Route path="/" element={<Navigate to="/login-register" replace />} />
                )}

                {/* Catch-all for any other routes */}
                {userIsLoggedIn ? (
                  <Route path="*" element={<Navigate to={`/users/${currentUser._id}`} replace />} />
                ) : (
                  <Route path="*" element={<Navigate to="/login-register" replace />} />
                )}
              </Routes>
            </Paper>
          </Grid>
        </Grid>
      </div>
    </BrowserRouter>
  );
}

// react root

const root = ReactDOM.createRoot(document.getElementById('photoshareapp'));
root.render(
  <QueryClientProvider client={queryClient}>
    <PhotoShare />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);