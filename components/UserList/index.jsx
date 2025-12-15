import React from "react";
import {
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
} from "@mui/material";

import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query"; ///
import { fetchUsers, fetchPhotosByUser } from "../../api";    ///

import useZustandStore from "../../zustandStore";
import "./styles.css";

import { useEffect, useState } from "react";
import socket from "../../socket";
import { formatDistanceToNow } from "date-fns";

function UserList() {
  // alert('NEW VERSION LOADED!'); 
  const navigate = useNavigate();

  // Zustand global store
  const advancedFeaturesEnabled = useZustandStore(
    (s) => s.advancedFeaturesEnabled
  );
  const setSelectedUserId = useZustandStore((s) => s.setSelectedUserId);
  const setSelectedPhotoId = useZustandStore((s) => s.setSelectedPhotoId);
  const currentUser = useZustandStore((s) => s.currentUser);

  // story 8 implementation
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentUser) return;

    const handleNewActivity = () => {
      queryClient.invalidateQueries(["users"]);       // re-fetch /user/list so sidebar updates
    };

    socket.on("new_activity", handleNewActivity);

    return () => {
      socket.off("new_activity", handleNewActivity);
    };
  }, [currentUser, queryClient]);

  // 1. Fetch users - ONLY if logged in
  const {
    data: users,
    isLoading: usersLoading,
    isError: usersError,
    error: usersErrorObj,
  } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: !!currentUser, // only run if logged in
  });

  // 2. Fetch photos for each user in parallel
  const photosQueries = useQueries({
    queries:
      users?.map((user) => ({
        queryKey: ["photosOfUser", user._id],
        queryFn: () => fetchPhotosByUser(user._id),
        enabled: !!users && !!currentUser, // currentUser check
      })) || [],
  });

  // Early return if not logged in
  if (!currentUser) {
    return null; // Don't render anything if not logged in
  }

  // Loading states
  if (usersLoading) return <div>Loading users...</div>;
  if (usersError) return <div>Error loading users: {usersErrorObj.message}</div>;

  const anyPhotosLoading = photosQueries.some((q) => q.isLoading);
  if (anyPhotosLoading) return <div>Loading photos...</div>;

  // 3. Combine users + photo counts
  const usersWithCounts = users.map((user, idx) => {
    const photos = photosQueries[idx]?.data || [];
    return { ...user, photoCount: photos.length, photos };
  });

  // 4. Collect all comments from all photos
  const allComments = usersWithCounts.flatMap((user) => user.photos.flatMap((photo) => photo.comments || [])
  );

  // 5. Count comments per user (comment authors)
  const commentCountMap = allComments.reduce((acc, comment) => {
    const uid = comment.user?._id;
    if (!uid) return acc;
    acc[uid] = (acc[uid] || 0) + 1;
    return acc;
  }, {});

  // 6. Final array sent to render
  const finalUsers = usersWithCounts.map((user) => ({
    ...user,
    commentCount: commentCountMap[user._id] || 0,
    photos: undefined,
  }));

  return (
    <List component="nav">
      {finalUsers.map((user, index) => (
        <React.Fragment key={user._id}>
          <ListItem
            secondaryAction={
              advancedFeaturesEnabled && (
                <>
                  {/* Bubble for number of photos */}
                  <span
                    className="count-bubble green"
                    title="Number of photos"
                    style={{ marginRight: "8px" }}
                  >
                    {user.photoCount}
                  </span>

                  {/* Bubble for number of comments */}
                  <button
                    className="count-bubble red"
                    title="Number of comments"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUserId(user._id);
                      setSelectedPhotoId(null);
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
            {/* Clicking user selects in Zustand and routes */}
            <ListItemButton
              component={Link}
              to={`/users/${user._id}`}
              onClick={() => {
                setSelectedUserId(user._id);
                setSelectedPhotoId(null);
              }}
            >
              {/* photo thumbnail for activity */}
              {user.lastActivity?.activity_type === "PHOTO_UPLOAD" &&
                user.lastActivity.photo_id &&
                user.lastActivity.file_name && (
                  <img
                    src={`/images/${user.lastActivity.file_name}`}
                    alt="activity"
                    style={{
                      width: 32,
                      height: 32,
                      objectFit: "cover",
                      borderRadius: 4,
                      marginRight: 8,
                      cursor: "pointer",
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); // prevent ListItemButton click
                      setSelectedUserId(user._id);
                      setSelectedPhotoId(user.lastActivity.photo_id);
                      navigate(`/photos/${user._id}`);
                    }}
                  />
                )}

              <ListItemText
                primary={`${user.first_name} ${user.last_name}`}
                secondary={
                  user.lastActivity
                    ? `${activityText(user.lastActivity)} • ${formatDistanceToNow(
                        new Date(user.lastActivity.date_time),
                        { addSuffix: true }
                      )}`
                    : "No recent activity"
                }
              />
            </ListItemButton>
          </ListItem>

          {index < finalUsers.length - 1 && <Divider component="li" />}
        </React.Fragment>
      ))}
    </List>
  );
}

function activityText(activity) {
  if (!activity) return "No recent activity";

  switch (activity.activity_type) {
    case "PHOTO_UPLOAD":
      return "posted a photo";
    case "COMMENT_ADDED":
      return "added a comment";
    case "USER_REGISTER":
      return "registered";
    case "USER_LOGIN":
      return "logged in";
    case "USER_LOGOUT":
      return "logged out";
    default:
      return "did something";
  }
}

export default UserList;