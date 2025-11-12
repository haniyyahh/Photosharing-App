// import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import ReactDOM from 'react-dom/client';
import React, { useState } from 'react';

import { Grid, Paper } from '@mui/material';
import {
  BrowserRouter, Route, Routes, useParams,
} from 'react-router-dom';

import './styles/main.css';
// import './styles.css';
// Import mock setup - Remove this once you have implemented the actual API calls
// import './lib/mockSetup.js';
import TopBar from './components/TopBar';
import UserDetail from './components/UserDetail';
import UserList from './components/UserList';
import UserPhotos from './components/UserPhotos';
import UserComments from './components/UserComments';

function UserDetailRoute() {
  const { userId } = useParams();
  // eslint-disable-next-line no-console
  // console.log('UserDetailRoute: userId is:', userId);
  return <UserDetail userId={userId} />;
}

function UserPhotosRoute({ advancedFeaturesEnabled }) {
  const { userId, photoId } = useParams();
  return (
    <UserPhotos 
      userId={userId} 
      photoId={photoId} 
      advancedFeaturesEnabled={advancedFeaturesEnabled} 
    />
  );
}

function PhotoShare() {

  // for adv. features toggle:
  const [advancedFeaturesEnabled, setAdvancedFeaturesEnabled] = useState(false);
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
              <UserList advancedFeaturesEnabled={advancedFeaturesEnabled}/>
            </Paper>
          </Grid>
          <Grid item sm={9}>
            <Paper className="main-grid-item">
              <Routes>
                <Route path="/users/:userId" element={<UserDetailRoute />} />
                <Route 
                  path="/photos/:userId/:photoId?" 
                  element={<UserPhotosRoute advancedFeaturesEnabled={advancedFeaturesEnabled} />} 
                />
                <Route path="/users" element={<UserList advancedFeaturesEnabled={advancedFeaturesEnabled}/>} />
                {/* new component for comments */}
                <Route path="/comments/:userId" element={<UserComments />} />
              </Routes>
            </Paper>
          </Grid>
        </Grid>
      </div>
    </BrowserRouter>
  );
}

const root = ReactDOM.createRoot(document.getElementById('photoshareapp'));
root.render(<PhotoShare />);
