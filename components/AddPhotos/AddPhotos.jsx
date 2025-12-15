import React, { useState } from "react";
import { useMutation, useQueryClient , useQuery } from "@tanstack/react-query";
import { Button, Box, Typography ,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from "@mui/material";
import useZustandStore from "../../zustandStore";
import { uploadPhoto , fetchUsers } from "../../api";

export default function AddPhotos() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [limitVisibility, setLimitVisibility] = useState(false);
  const [sharedWith, setSharedWith] = useState([]);

  const loggedInUser = useZustandStore((s) => s.loggedInUser); 
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: (formData) => uploadPhoto(formData),
    onSuccess: () => {
      setStatus("Upload successful!");
      setFile(null);

      // auto refresh the user's photos
      if (loggedInUser?._id) {
        queryClient.invalidateQueries(["photosOfUser", loggedInUser._id]);
      }
    },
    onError: () => setStatus("Upload failed. Try again."),
  });

  const handleUpload = () => {
    if (!file) {
      setStatus("Choose a file first.");
      return;
    }

    setStatus("");

    const formData = new FormData();
    formData.append("uploadedphoto", file);

    // visibility settings
    if (limitVisibility) {
      formData.append("sharedWith", JSON.stringify(sharedWith));
    }

    uploadMutation.mutate(formData);
  };

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

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

      <Box sx={{ mt: 2 }}>
        <FormControlLabel
          control={(
            <Checkbox
              size="small"
              checked={limitVisibility}
              onChange={(e) => {
                setLimitVisibility(e.target.checked);
                if (!e.target.checked) setSharedWith([]);
              }}
            />
          )}
          label={(
            <Typography variant="body2">
              Limit who can see this photo
            </Typography>
          )}
        />
      </Box>

      {limitVisibility && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2">
            Share with:
          </Typography>

          <FormGroup>
            {users
              .filter((u) => u._id !== loggedInUser?._id)
              .map((user) => (
                <FormControlLabel
                  key={user._id}
                  control={(
                    <Checkbox
                      size="small"
                      checked={sharedWith.includes(user._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSharedWith([...sharedWith, user._id]);
                        } else {
                          setSharedWith(
                            sharedWith.filter((id) => id !== user._id)
                          );
                        }
                      }}
                    />
                  )}
                  label={(
                    <Typography variant="body2">
                      {user.first_name} {user.last_name}
                    </Typography>
                  )}
                />
              ))}
          </FormGroup>
        </Box>
      )}

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