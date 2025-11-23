import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Box, Typography } from "@mui/material";
import useZustandStore from "../../zustandStore";
import { uploadPhoto } from "../../api";

export default function AddPhotos() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  const loggedInUser = useZustandStore((s) => s.loggedInUser); 
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: (formData) => uploadPhoto(formData),
    onSuccess: () => {
      setStatus("Upload successful!");
      setFile(null);

      // Auto refresh the user's photos
      if (loggedInUser?._id) {
        queryClient.invalidateQueries(["photosOfUser", loggedInUser._id]);
      }
    },
    onError: () => setStatus("Upload failed. Try again."),
  });

  const handleUpload = () => {
    if (!file) {
      setStatus("Choose a file first.");
      return; // NOW consistent-return is satisfied
    }

    setStatus("");

    const formData = new FormData();
    formData.append("uploadedphoto", file);

    uploadMutation.mutate(formData);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Upload New Photo
      </Typography>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <Button 
        variant="contained" 
        sx={{ mt: 2 }} 
        onClick={handleUpload}
        disabled={uploadMutation.isLoading}
      >
        {uploadMutation.isLoading ? "Uploading..." : "Upload"}
      </Button>

      {status && (
        <Typography sx={{ mt: 1 }} color="text.secondary">
          {status}
        </Typography>
      )}
    </Box>
  );
}