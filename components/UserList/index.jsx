import React from "react";
import {
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
} from "@mui/material";

import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import { fetchUsers, fetchPhotosByUser } from "../../api";

import "./styles.css";

function UserList({ advancedFeaturesEnabled }) {
  const navigate = useNavigate();

  // 1. Fetch all users
  const {
    data: users,
    isLoading: usersLoading,
    isError: usersError,
    error: usersErrorObj,
  } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  // 2. Fetch photos for each user in parallel
  const photosQueries = useQueries({
    queries:
      users?.map((user) => ({
        queryKey: ["photosOfUser", user._id],
        queryFn: () => fetchPhotosByUser(user._id),
        enabled: !!users,
      })) || [],
  });

  // Loading and error states
  if (usersLoading) return <div>Loading users...</div>;
  if (usersError) return <div>Error loading users: {usersErrorObj.message}</div>;

  const anyPhotosLoading = photosQueries.some((q) => q.isLoading);
  if (anyPhotosLoading) return <div>Loading photos...</div>;

  // 3. Compose users with photo counts and photos
  const usersWithCounts = users.map((user, idx) => {
    const photos = photosQueries[idx]?.data || [];
    return { ...user, photoCount: photos.length, photos };
  });

  // 4. Aggregate all comments from all photos of all users
  const allComments = usersWithCounts.flatMap((user) =>
    user.photos.flatMap((photo) => photo.comments || [])
  );

  // 5. Count comments per user (who made the comment)
  const commentCountMap = allComments.reduce((acc, comment) => {
    const commentUserId = comment.user?._id;
    if (!commentUserId) return acc;
    acc[commentUserId] = (acc[commentUserId] || 0) + 1;
    return acc;
  }, {});

  // 6. Final users array with comment counts and cleaned photos array
  const finalUsers = usersWithCounts.map((user) => ({
    ...user,
    commentCount: commentCountMap[user._id] || 0,
    photos: undefined,
  }));

  console.log(finalUsers);
  console.log("advancedFeaturesEnabled:", advancedFeaturesEnabled);

  return (
    <List component="nav">
      {finalUsers.map((user, index) => (
        <React.Fragment key={user._id}>
          <ListItem
            secondaryAction={
              advancedFeaturesEnabled && (
                <>
                  <span
                    className="count-bubble green"
                    title="Number of photos"
                    style={{ marginRight: "8px" }}
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
                    style={{
                      cursor: "pointer",
                      border: "none",
                      background: "red",
                      color: "white",
                      borderRadius: "50%",
                      padding: "4px 8px",
                      minWidth: "20px",
                    }}
                  >
                    {user.commentCount}
                  </button>
                </>
              )
            }
            disablePadding
          >
            <ListItemButton component={Link} to={`/users/${user._id}`}>
              <ListItemText primary={`${user.first_name} ${user.last_name}`} />
            </ListItemButton>
          </ListItem>

          {index < finalUsers.length - 1 && <Divider component="li" />}
        </React.Fragment>
      ))}
    </List>
  );
}

export default UserList;
