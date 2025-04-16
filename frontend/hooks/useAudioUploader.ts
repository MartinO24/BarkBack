import { useState } from 'react';
import { Platform, Alert } from 'react-native';
// Import FileSystem if you uncomment the file existence check below
import * as FileSystem from 'expo-file-system';

// Define the shape of the data expected on successful upload from the backend
interface UploadSuccessData {
    filename?: string;
    translation?: string;
}

// Define the return type of the hook for clarity
interface UseAudioUploaderReturn {
    uploadAudio: (uriToUpload: string | null) => Promise<UploadSuccessData>; // Function returns a Promise
    isUploading: boolean; // State indicating upload progress
}

/**
 * Custom hook to handle uploading audio recordings.
 * Manages upload state and platform-specific FormData creation.
 */
export function useAudioUploader(): UseAudioUploaderReturn {
    // State within the hook to track upload progress
    const [isUploading, setIsUploading] = useState(false);

    /**
     * Uploads the audio file from the given URI.
     * Handles platform differences for FormData creation (web vs. mobile).
     * @param uriToUpload The URI of the recording (file:///... on mobile, blob:... on web)
     * @returns Promise resolving with { filename, translation } on success.
     * @throws Error on failure (configuration, network, server error).
     */
    const uploadAudio = async (uriToUpload: string | null): Promise<UploadSuccessData> => {
        // --- 1. Input Validation ---
        if (!uriToUpload) {
            console.error("Upload function called with null URI.");
            throw new Error("No recording URI provided to upload.");
        }

        // Access the environment variable defined in .env (prefixed with EXPO_PUBLIC_)
        const apiUrl = process.env.EXPO_PUBLIC_API_URL;

        if (!apiUrl) {
            console.error("API URL is not configured in .env (needs EXPO_PUBLIC_ prefix).");
            throw new Error("API URL is not configured. Check .env file (needs EXPO_PUBLIC_ prefix).");
        }

         //--- Optional: Check if file exists before uploading (Mobile only) ---
         if (Platform.OS !== 'web') {
             try {
                 const fileInfo = await FileSystem.getInfoAsync(uriToUpload);
                 if (!fileInfo.exists) {
                     throw new Error(`Recording file not found at URI: ${uriToUpload}`);
                 }
             } catch (fileError: any) {
                 console.error("File system error:", fileError);
                 throw new Error(`Failed to access recording file: ${fileError.message}`);
             }
         }

        // --- 2. Set Loading State ---
        setIsUploading(true);
        console.log(`Starting upload (${Platform.OS}) for URI:`, uriToUpload);
        console.log('Target API URL:', apiUrl);

        // --- 3. Prepare FormData (Platform Specific) ---
        const formData = new FormData();
        let fileName: string; // Define fileName here to be accessible later

        try { // Wrap platform-specific logic and fetch in a try block
            if (Platform.OS === 'web') {
                // --- WEB ---
                console.log(">>> EXECUTING WEB PLATFORM LOGIC (Fetching Blob) <<<");

                if (!uriToUpload.startsWith('blob:')) {
                    // Safety check in case expo-av web behavior changes
                    throw new Error(`Web platform expected blob URI, but received: ${uriToUpload}`);
                }

                // Fetch the actual Blob data from the blob: URI
                const response = await fetch(uriToUpload);
                if (!response.ok) {
                    throw new Error(`Failed to fetch blob data from ${uriToUpload}: ${response.statusText}`);
                }
                const blob = await response.blob(); // Get the Blob object
                console.log(`Blob fetched successfully. Size: ${blob.size}, Type: ${blob.type}`);

                if (blob.size === 0) {
                    throw new Error("Recording Blob is empty.");
                }

                // Create a filename for the blob
                // Use MIME type from blob if available, otherwise default (e.g., .webm)
                const extension = blob.type?.split('/')[1]?.split(';')[0] || 'webm'; // Handle potential codecs in type like 'audio/webm;codecs=opus'
                fileName = `recording-${Date.now()}.${extension}`;

                // Append the actual Blob object to FormData
                // The third argument (fileName) is crucial for the backend to identify the file
                console.log(`Appending Blob for web. Filename: ${fileName}, Blob Type: ${blob.type}, Blob Size: ${blob.size}`);
                formData.append('uploaded_file', blob, fileName); // Key must match backend parameter

            } else {
                // --- MOBILE (iOS/Android) ---
                console.log(">>> EXECUTING MOBILE PLATFORM LOGIC (Using {uri, name, type}) <<<");

                const uriParts = uriToUpload.split('.');
                const fileType = uriParts[uriParts.length - 1];
                // Determine filename and ensure it has an extension
                fileName = `recording-${Date.now()}.${fileType || 'm4a'}`; // Default to m4a if no extension found

                // Create the object structure expected by RN fetch for file uploads
                const fileData = {
                    uri: Platform.OS === 'ios' ? uriToUpload.replace('file://', '') : uriToUpload, // Remove file:// prefix for iOS if present
                    name: fileName,
                    // Construct MIME type, default if needed
                    type: `audio/${fileType || 'm4a'}`,
                };
                console.log("Appending mobile file data object:", JSON.stringify(fileData, null, 2));

                // Append the object - RN fetch handles reading the file from the URI
                formData.append('uploaded_file', fileData as any); // Key must match backend parameter
            }

            // --- 4. Perform Fetch Request (Common Logic) ---
            console.log(`FormData prepared. Sending request to ${apiUrl}...`);
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData,
                // 'Content-Type': 'multipart/form-data' header is usually set automatically by fetch when body is FormData
                // Add other headers if needed (e.g., Authorization)
            });

            // --- 5. Handle Response (Common Logic) ---
            let responseData: any;
            try {
                responseData = await response.json();
            } catch (jsonError: any) {
                // Handle cases where the server response isn't valid JSON
                console.error('Failed to parse JSON response:', jsonError);
                const textResponse = await response.text(); // Try reading as text for more clues
                console.error('Raw server response text:', textResponse);
                throw new Error(`Server returned non-JSON response (${response.status}): ${textResponse.substring(0, 100)}`); // Include snippet of text response
            }

            if (response.ok && responseData.translation) {
                // Success case
                console.log('Upload successful (hook):', responseData);
                return {
                    filename: responseData.filename || fileName, // Return filename used/received
                    translation: responseData.translation,
                };
            } else {
                // Handle backend errors (validation, server errors, etc.)
                console.error('Upload failed (hook):', response.status, responseData);
                let processedErrorDetail: string = `Server error: ${response.status}`; // Default message
                if (responseData && responseData.detail) {
                    if (typeof responseData.detail === 'string') {
                        processedErrorDetail = responseData.detail;
                    } else if (Array.isArray(responseData.detail) && responseData.detail.length > 0) {
                        const firstError = responseData.detail[0];
                        if (firstError && typeof firstError.msg === 'string') {
                            const location = firstError.loc ? ` (Field: ${firstError.loc.join(' -> ')})` : '';
                            processedErrorDetail = `Validation Error: ${firstError.msg}${location}`;
                        } else {
                            processedErrorDetail = `Validation Error: ${JSON.stringify(responseData.detail)}`;
                        }
                    } else if (typeof responseData.detail === 'object') {
                        processedErrorDetail = `Server Error Detail: ${JSON.stringify(responseData.detail)}`;
                    }
                }
                // Throw an error with the processed message
                throw new Error(processedErrorDetail);
            }

        } catch (err: any) {
            // Catch errors from platform logic, fetch, or response handling
            console.error('Upload construction/fetch/processing failed (hook):', err);
            // Re-throw the error so the calling component can handle it
            throw new Error(`Upload failed: ${err.message}`);
        } finally {
            // --- 6. Reset Loading State ---
            setIsUploading(false);
        }
    }; // End of uploadAudio function

    // Return the upload function and the loading state for the component to use
    return { uploadAudio, isUploading };

} // End of useAudioUploader hook
