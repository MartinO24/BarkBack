import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Alert, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Audio } from 'expo-av';

// Import the components from the correct path
import RecordButton from '@/components/RecordButton'; // Adjust path if needed
import UploadButton from '@/components/UploadButton'; // Adjust path if needed
import TranslationList from '@/components/TranslationList'; // Adjust path if needed

// Define the props type for safety with TypeScript (optional but good practice)
type TranslationItem = {
  id: string;
  filename?: string; // Mark as optional if it might be missing
  translation?: string; // Mark as optional
};

export default function HomeScreen() { // Changed function name to reflect screen context
  // State variables
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null); // Type annotation
  const [isLoading, setIsLoading] = useState(false);
  const [translations, setTranslations] = useState<TranslationItem[]>([]); // Type annotation for array
  const [error, setError] = useState<string | null>(null); // Type annotation

  // Audio recording specific state
  const [recording, setRecording] = useState<Audio.Recording | null>(null); // Type annotation
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  // --- Audio Functions ---
  const startRecording = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (permissionResponse?.status !== 'granted') {
        console.log('Requesting microphone permission...');
        await requestPermission();
        // Re-check permissions after request
        const updatedPermissions = await Audio.getPermissionsAsync();
        if (updatedPermissions.status !== 'granted') {
            Alert.alert("Permissions Required", "Microphone access is needed to record audio.");
            setIsLoading(false);
            return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording session...');
      const { recording: newRecording } = await Audio.Recording.createAsync(
         Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingUri(null);
      console.log('Recording started.');

    } catch (err: any) { // Type 'any' or a more specific error type
      console.error('Failed to start recording:', err);
      setError(`Failed to start recording: ${err.message}`);
      setIsRecording(false);
    } finally {
        setIsLoading(false);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    console.log('Stopping recording...');
    setIsLoading(true);
    setIsRecording(false);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri);
      setRecording(null);
      console.log('Recording stopped and stored at:', uri);
      // uploadAudio(uri); // <-- Uncomment for auto-upload

    } catch (err: any) {
      console.error('Failed to stop recording:', err);
      setError(`Failed to stop recording: ${err.message}`);
       setRecordingUri(null);
    } finally {
        setIsLoading(false);
    }
  };

  // --- API Function ---
  const uploadAudio = async (uriToUpload: string | null) => { // Add type annotation
    if (!uriToUpload) {
      Alert.alert("Upload Error", "No recording available to upload.");
      return;
    }

    // Use the API_URL from environment variables
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;

    // Check if API_URL is defined before making the call
    if (!apiUrl) {
      const urlError = "API URL is not configured. Please check your .env file.";
      console.error(urlError);
      setError(urlError);
      Alert.alert("Configuration Error", urlError);
      setIsLoading(false);
      return;
  }

    setIsLoading(true);
    setError(null);
    console.log('Starting upload for:', uriToUpload);

    const formData = new FormData();
    const uriParts = uriToUpload.split('.');
    const fileType = uriParts[uriParts.length - 1];
    const fileName = `recording-${Date.now()}.${fileType || 'm4a'}`;

    // Adjust key if your backend expects 'file' instead of 'uploaded_file'
    formData.append('uploaded_file', {
      uri: Platform.OS === 'ios' ? uriToUpload.replace('file://', '') : uriToUpload,
      name: fileName,
      type: `audio/${fileType || 'm4a'}`,
    } as any); // Use 'as any' for FormData append if TypeScript complains

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      // Try parsing JSON regardless of status code first
      let responseData: any;
      try {
          responseData = await response.json();
      } catch (jsonError: any) {
           console.error('Failed to parse JSON response:', jsonError);
           setError(`Server returned non-JSON response (${response.status})`);
           setIsLoading(false);
           return; // Stop further processing
      }


      if (response.ok && responseData.translation) {
        console.log('Upload successful:', responseData);
        setTranslations(prevTranslations => [
            {
                id: `trans-${Date.now()}-${Math.random()}`, // Generate ID
                filename: responseData.filename || fileName,
                translation: responseData.translation,
            },
            ...prevTranslations
        ]);
        setRecordingUri(null);
      } else {
        console.error('Upload failed:', response.status, responseData);
        const errorDetail = responseData?.detail || `Server error: ${response.status}`; // Optional chaining
        setError(errorDetail);
        Alert.alert("Translation Failed", errorDetail);
      }
    } catch (err: any) {
      console.error('Network request failed:', err);
      const networkError = `Network request failed: ${err.message}`;
      setError(networkError);
      Alert.alert("Network Error", networkError);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Event Handlers ---
  const handleRecordPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleUploadPress = () => {
      if (recordingUri) {
        uploadAudio(recordingUri);
      } else {
        Alert.alert("Nothing to Upload", "Please record some audio first.");
      }
  };

  // --- Render Logic ---
  // Note: Expo Router often uses a Stack component in _layout.tsx for headers.
  // This basic example assumes no complex layout is needed yet.
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'} />
      <View style={styles.container}>
        <Text style={styles.title}>Animal Sound Translator</Text>

        {error && <Text style={styles.errorText}>Error: {error}</Text>}
        {isRecording && <Text style={styles.recordingStatus}>Recording...</Text>}
        {isLoading && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}

        <RecordButton isRecording={isRecording} onPress={handleRecordPress} />

        {recordingUri && !isLoading && (
            <Text style={styles.infoText}>Ready: {recordingUri.split('/').pop()}</Text>
        )}

        <UploadButton
          recordingUri={recordingUri}
          isLoading={isLoading}
          onPress={handleUploadPress}
        />

        <TranslationList translations={translations} />
      </View>
    </SafeAreaView>
  );
}

// --- Styles --- (Keep styles as before)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 10 : 20,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#343a40',
  },
  recordingStatus: {
      fontSize: 16,
      color: '#dc3545', // Red
      fontWeight: 'bold',
      marginBottom: 10,
  },
  loader: {
    marginVertical: 20,
  },
  infoText: {
    marginVertical: 5,
    fontStyle: 'italic',
    color: 'grey',
    fontSize: 12,
    textAlign: 'center',
  },
  errorText: {
    color: '#dc3545', // Red
    marginVertical: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontWeight: 'bold'
  }
});