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
  // Zustand global feature toggle
  const advancedFeaturesEnabled = useZustandStore((s) => s.advancedFeaturesEnabled);
  const setAdvancedFeaturesEnabled = useZustandStore((s) => s.setAdvancedFeaturesEnabled);

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

          <Grid item sm={3}>
            <Paper className="main-grid-item">
              <UserList advancedFeaturesEnabled={advancedFeaturesEnabled} />
            </Paper>
          </Grid>

          <Grid item sm={9}>
            <Paper className="main-grid-item">
              <Routes>

                {/* User detail */}
                <Route path="/users/:userId" element={<UserDetailRoute />} />

                {/* Photos */}
                <Route
                  path="/photos/:userId/:photoId?"
                  element={<UserPhotosRoute />}
                />

                {/* All users */}
                <Route
                  path="/users"
                  element={<UserList advancedFeaturesEnabled={advancedFeaturesEnabled} />}
                />

                {/* Comments (advanced mode only) */}
                <Route
                  path="/comments/:userId"
                  element={
                    advancedFeaturesEnabled ? (
                      <UserComments />
                    ) : (
                      <RedirectToUserDetails />
                    )
                  }
                />
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