import React, { useState, useEffect } from 'react';
import {
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
} from '@mui/material';

import axios from "axios";
import { Link, useNavigate } from 'react-router-dom';

import './styles.css';

// NEW: import Zustand store
import useZustandStore from '../../zustandStore';

function UserList() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // NEW: advanced mode from global store
  const advancedFeaturesEnabled = useZustandStore((s) => s.advancedFeaturesEnabled);

  // NEW: global selected-user setter
  const setSelectedUserId = useZustandStore((s) => s.setSelectedUserId);
  const setSelectedPhotoId = useZustandStore((s) => s.setSelectedPhotoId);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersRes = await axios.get('http://localhost:3001/user/list');
        const fetchedUsers = usersRes.data;

        // for each user, fetch their photos and count them
        const usersWithCounts = await Promise.all(
          fetchedUsers.map(async (user) => {
            try {
              const photosRes = await axios.get(
                `http://localhost:3001/photosOfUser/${user._id}`
              );
              const photos = photosRes.data;

              return { ...user, photoCount: photos.length, photos };
            } catch {
              return { ...user, photoCount: 0, photos: [] };
            }
          })
        );

        // count comments across all users
        const allComments = usersWithCounts.flatMap((user) =>
          user.photos.flatMap((photo) => photo.comments || [])
        );

        const commentCountMap = allComments.reduce((acc, comment) => {
          const uid = comment.user?._id;
          if (!uid) return acc;
          acc[uid] = (acc[uid] || 0) + 1;
          return acc;
        }, {});

        const finalUsers = usersWithCounts.map((user) => ({
          ...user,
          commentCount: commentCountMap[user._id] || 0,
          photos: undefined,
        }));

        setUsers(finalUsers);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // only run once at instantiation of the component

  if (loading) return <div>Loading information...</div>;
  if (error) return <div>Error with loading user: {error.message}</div>;

  console.log(users);
  console.log('advancedFeaturesEnabled:', advancedFeaturesEnabled);

  // returns now count bubbles for comments and # of photos 
  // per user when adv. feature is toggled
  return (
    <List component="nav">
      {users.map((user, index) => (
        <React.Fragment key={user._id}>
          <ListItem
            secondaryAction={
              advancedFeaturesEnabled && (
                <>
                  <span
                    className="count-bubble green"
                    title="Number of photos"
                    style={{ marginRight: '8px' }}
                  >
                    {user.photoCount}
                  </span>

                  <button
                    className="count-bubble red"
                    title="Number of comments"
                    onClick={(e) => {
                      e.stopPropagation();

                      // NEW: sync global state
                      setSelectedUserId(user._id);
                      setSelectedPhotoId(null);

                      navigate(`/comments/${user._id}`);
                    }}
                    style={{
                      cursor: 'pointer',
                      border: 'none',
                      background: 'red',
                      color: 'white',
                      borderRadius: '50%',
                      padding: '4px 8px',
                      minWidth: '20px',
                    }}
                  >
                    {user.commentCount}
                  </button>
                </>
              )
            }
            disablePadding
          >
            {/* default links to user pages */}
            <ListItemButton
              component={Link}
              to={`/users/${user._id}`}
              onClick={() => {
                // NEW: sync global state when selecting a user
                setSelectedUserId(user._id);
                setSelectedPhotoId(null);
              }}
            >
              <ListItemText primary={`${user.first_name} ${user.last_name}`} />
            </ListItemButton>
          </ListItem>

          {/* add a divider after all user names except last */}
          {index < users.length - 1 && <Divider component="li" />}
        </React.Fragment>
      ))}
    </List>
  );
}

export default UserList;