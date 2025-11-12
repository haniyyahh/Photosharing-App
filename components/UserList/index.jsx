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

function UserList({ advancedFeaturesEnabled }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersRes = await axios.get('http://localhost:3001/user/list');
        const fetchedUsers = usersRes.data;

        // for each user, fetch their photos and count them
        const usersWithCounts = await Promise.all(fetchedUsers.map(async (user) => {
          try {
            // fetch all photos for this user
            const photosRes = await axios.get(`http://localhost:3001/photosOfUser/${user._id}`);
            const photos = photosRes.data;
            // keep a count
            return { ...user, photoCount: photos.length, photos };
          } catch {
            // set to 0 if fails
            return { ...user, photoCount: 0, photos: [] };
          }
        }));
        // get comment counts for each users
        const allComments = usersWithCounts.flatMap(user => user.photos.flatMap(photo => photo.comments || [])
        );

        // get a count of how many comments each individual user made
        const commentCountMap = allComments.reduce((acc, comment) => {
          const userId = comment.user?._id;
          if (!userId) return acc;
          acc[userId] = (acc[userId] || 0) + 1;
          return acc;
        }, {});

        // store final counts of photos and comments in one list
        const finalUsers = usersWithCounts.map(user => ({
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
            secondaryAction={advancedFeaturesEnabled && (
              <>
                <span // no navigation on this bubble
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
                    navigate(`/comments/${user._id}`);
                  }}
                  style={{ cursor: 'pointer', border: 'none', background: 'red', color: 'white', borderRadius: '50%', padding: '4px 8px', minWidth: '20px' }}
                >
                  {user.commentCount}
                </button>
              </>
            )}
            disablePadding
          >
            {/* default links to user pages */}
            <ListItemButton component={Link} to={`/users/${user._id}`}>
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
