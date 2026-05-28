import * as React from 'react';

function useUpload() {
  const [loading, setLoading] = React.useState(false);
  const upload = React.useCallback(async (input) => {
    try {
      setLoading(true);
      console.log("[useUpload] Starting upload with input:", input);
      let response;
      if ("file" in input && input.file) {
        let fileToUpload = input.file;
        console.log("[useUpload] Detected file input:", {
          name: fileToUpload.name,
          type: fileToUpload.type,
          size: fileToUpload.size
        });
        if (fileToUpload.name.endsWith('.docx')) {
          console.log("[useUpload] Keeping .docx original type:", fileToUpload.type);
        }
        const formData = new FormData();
        formData.append("file", fileToUpload);
        console.log("[useUpload] Sending POST request to /_create/api/upload/ with FormData");
        response = await fetch("/_create/api/upload/", {
          method: "POST",
          body: formData
        });
      } else if ("url" in input) {
        console.log("[useUpload] Detected URL input:", input.url);
        response = await fetch("/_create/api/upload/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ url: input.url })
        });
      } else if ("base64" in input) {
        console.log("[useUpload] Detected base64 input length:", input.base64?.length);
        response = await fetch("/_create/api/upload/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ base64: input.base64 })
        });
      } else {
        console.log("[useUpload] Detected buffer/other input type");
        response = await fetch("/_create/api/upload/", {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream"
          },
          body: input.buffer
        });
      }
      
      console.log("[useUpload] Received response status:", response.status, response.statusText);
      if (!response.ok) {
        const text = await response.text();
        console.error("[useUpload] Response not OK. Status:", response.status, "Body:", text);
        if (response.status === 413) {
          throw new Error("Upload failed: File too large.");
        }
        throw new Error("Upload failed: " + response.status + " " + text);
      }
      const data = await response.json();
      console.log("[useUpload] Successfully parsed JSON response:", data);
      return { url: data.url, mimeType: data.mimeType || null };
    } catch (uploadError) {
      console.error("[useUpload] Exception occurred during upload:", uploadError);
      if (uploadError instanceof Error) {
        return { error: uploadError.message };
      }
      if (typeof uploadError === "string") {
        return { error: uploadError };
      }
      return { error: "Upload failed" };
    } finally {
      setLoading(false);
    }
  }, []);

  return [upload, { loading }];
}

export { useUpload };
export default useUpload;