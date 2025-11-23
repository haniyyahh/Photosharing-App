import { useState } from "react";
import { uploadPhoto } from "../../api";  // you will create this

export default function AddPhotos() {
  const [file, setFile] = useState(null);

  const handleUpload = () => {
    if (!file) return alert("Choose a file first.");

    const formData = new FormData();
    formData.append("uploadedphoto", file);

    uploadPhoto(formData)
      .then(() => alert("Uploaded!"))
      .catch(() => alert("Upload failed."));
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
}
// export default AddPhotos;