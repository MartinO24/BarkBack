import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Alert, SafeAreaView, StatusBar, Platform, TouchableOpacity } from 'react-native';
import { Audio, InterruptionModeIOS } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import components
import RecordButton from '../components/RecordButton';
import UploadButton from '../components/UploadButton';
import TranslationList from '../components/TranslationList';

// Import the custom hooks
import { useAudioUploader } from '../hooks/useAudioUploader';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

// Define types
type TranslationItem = {
  id: string;
  filename?: string;
  translation?: string;
  uri: string;
};

// --- 2. Define a key for storage ---
const TRANSLATIONS_STORAGE_KEY = '@BarkBack:Translations';

export default function HomeScreen() {
  // --- State managed by this screen ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [translations, setTranslations] = useState<TranslationItem[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { uploadAudio: performUpload, isUploading } = useAudioUploader();
  const { playAudio, stopPlayback, isPlaying } = useAudioPlayer();
  const [currentlyPlayingUri, setCurrentlyPlayingUri] = useState<string | null>(null);
  const [isStorageLoading, setIsStorageLoading] = useState(true); // State to track initial load


  // --- 3. useEffect for Loading Translations on Mount ---
  useEffect(() => {
    const loadTranslations = async () => {
      console.log("Attempting to load translations from AsyncStorage...");
      setIsStorageLoading(true); // Indicate loading from storage
      try {
        const storedTranslations = await AsyncStorage.getItem(TRANSLATIONS_STORAGE_KEY);
        if (storedTranslations !== null) {
          console.log("Found stored translations.");
          setTranslations(JSON.parse(storedTranslations));
        } else {
          console.log("No translations found in storage.");
          setTranslations([]); // Initialize as empty if nothing stored
        }
      } catch (e) {
        console.error('Failed to load translations from storage:', e);
        setError('Could not load translation history.');
        setTranslations([]); // Initialize as empty on error
      } finally {
        setIsStorageLoading(false); // Done loading from storage
      }
    };

    loadTranslations();
  }, []); // Empty dependency array means this runs only once on mount

  // --- 4. useEffect for Saving Translations on Change ---
  useEffect(() => {
    // Don't save during the initial load phase
    if (isStorageLoading) {
      return;
    }

    const saveTranslations = async () => {
      console.log("Attempting to save translations to AsyncStorage...");
      try {
        const jsonValue = JSON.stringify(translations);
        await AsyncStorage.setItem(TRANSLATIONS_STORAGE_KEY, jsonValue);
        console.log("Translations saved successfully.");
      } catch (e) {
        console.error('Failed to save translations to storage:', e);
        // Optionally inform user, but might be too noisy
        // setError('Could not save translation history.');
      }
    };

    saveTranslations();
  }, [translations, isStorageLoading]); // Dependency array: run when translations or isStorageLoading changes

  // --- Effect to clear playing URI (keep as before) ---
  useEffect(() => { if (!isPlaying) { setCurrentlyPlayingUri(null); } }, [isPlaying]);

  // --- Audio Recording Functions ---
  const startRecording = async () => {
    setError(null); // Clear previous errors
    // Stop playback using the hook's function before recording
    if (isPlaying) {
      console.log("Stopping playback before recording...");
      try {
        await stopPlayback();
      } catch (stopError: any) {
        console.error("Error stopping playback before recording:", stopError);
        setError(`Failed to stop previous playback: ${stopError.message}`);
        // Potentially return here if stopping playback is critical before recording
      }
    }
    // --- End playback stop ---
    setIsLoading(true); // Indicate preparation
    try {
      // Request permissions if needed
      if (permissionResponse?.status !== 'granted') {
        await requestPermission();
        const updatedPermissions = await Audio.getPermissionsAsync();
        if (updatedPermissions.status !== 'granted') {
          Alert.alert("Permissions Required", "Microphone access is needed.");
          setIsLoading(false); return;
        }
      }
      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true, // May need adjustment depending on desired behavior
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      });
      console.log('Starting recording session...');
      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingUri(null); // Clear previous recording URI
      console.log('Recording started.');
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setError(`Start Recording Failed: ${err.message}`); // Set main error state
      setIsRecording(false);
    } finally {
      setIsLoading(false); // Done preparing
    }
  };

  // stopRecording function remains the same (deals with Audio.Recording)
  const stopRecording = async () => {
    if (!recording) return;
    console.log('Stopping recording...');
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log(">>> URI from recording.getURI():", uri); // Keep log for debugging URIs
      setRecordingUri(uri); // Set the URI for playback/upload
      setRecording(null);
      console.log('Recording stopped.');
    } catch (err: any) {
      console.error('Failed to stop recording:', err);
      setError(`Stop Recording Failed: ${err.message}`);
      setRecordingUri(null);
    }
  };

  // --- Event Handlers ---
  const handleRecordPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      // Stop playback via hook before starting recording
      if (isPlaying) {
        stopPlayback()
          .then(() => startRecording()) // Start recording only after stopping successfully
          .catch(err => setError(`Stop Playback Failed: ${err.message}`)); // Handle stop error
      } else {
        startRecording(); // Start recording if not playing
      }
    }
  };

  const handleUploadPress = async () => {
    
    if (isPlaying) {
      console.log("Stopping playback before upload...");
      try {
        await stopPlayback();
      } catch (stopError: any) {
        console.error("Error stopping playback before upload:", stopError);
        setError(`Failed to stop playback before upload: ${stopError.message}`);
        return;
      }
    }

    // Log the URI being passed to the upload hook
    console.log(">>> URI passed to upload hook:", recordingUri);
    if (!recordingUri) { Alert.alert("Nothing to Upload", "Please record some audio first."); return; }

    const uriToUpload = recordingUri; // Capture the URI before clearing it

    setError(null); setIsLoading(true);
    try {
      const result = await performUpload(uriToUpload); // Pass the captured URI

      // --- Store the URI along with other data ---
      setTranslations(prevTranslations => [
        {
          id: `trans-${Date.now()}-${Math.random()}`,
          filename: result.filename,
          translation: result.translation,
          uri: uriToUpload, // <-- Store the URI here
        },
        ...prevTranslations
      ]);
      setRecordingUri(null); // Clear latest recording URI after successful upload

    } catch (uploadError: any) {
      console.error("Upload hook failed:", uploadError); setError(uploadError.message || "An unknown upload error occurred."); Alert.alert("Upload Failed", uploadError.message || "An unknown error occurred.");
    } finally { setIsLoading(false); }
  };

  // Handles pressing the Play/Pause button for the LATEST recording
  const handlePlaybackPress = async () => {
    setError(null);
    // Check if the LATEST recording is the one currently playing
    if (isPlaying && currentlyPlayingUri === recordingUri) {
      // Currently playing this one, so stop it
      try {
        await stopPlayback();
        // useEffect watching isPlaying will clear currentlyPlayingUri
      } catch (err: any) { setError(err.message); }
    } else {
      // Not playing this one (or nothing is playing), so play it
      if (recordingUri) {
        try {
          await playAudio(recordingUri);
          // If playAudio succeeds, mark this URI as the one playing
          setCurrentlyPlayingUri(recordingUri);
        } catch (err: any) { setError(err.message); }
      } else { Alert.alert("No recording", "Cannot play audio."); }
    }
  };

  // Handles pressing the Play/Pause button for a HISTORY item
  const handleHistoryItemPress = async (uri: string) => {
    if (!uri) { Alert.alert("Error", "Audio URI is missing."); return; }
    setError(null);
    // Check if THIS history item is the one currently playing
    if (isPlaying && currentlyPlayingUri === uri) {
      // Currently playing this item, so stop it
      try {
        await stopPlayback();
        // useEffect watching isPlaying will clear currentlyPlayingUri
      } catch (err: any) { setError(err.message); }
    } else {
      // Not playing this item (or nothing is playing), so play it
      try {
        await playAudio(uri);
        // If playAudio succeeds, mark this URI as the one playing
        setCurrentlyPlayingUri(uri);
      } catch (err: any) {
        console.error("Error playing history item:", err);
        setError(err.message);
        Alert.alert("Playback Failed", err.message);
      }
    }
  };


  // --- Render Logic ---
  // Combine general loading state with uploader-specific loading state for UI feedback
  const combinedIsLoading = isLoading || isUploading || isStorageLoading;;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Configure status bar appearance */}
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'} />
      {/* Main container */}
      <View style={styles.container}>
        <Text style={styles.title}>Welcome To BarkBack</Text>

        {/* Status Indicators Area */}
        <View style={styles.statusContainer}>
          {error && <Text style={styles.errorText}>Error: {error}</Text>}
          {isRecording && <Text style={styles.recordingStatus}>Recording...</Text>}
          {/* Show loader only if combined loading is true AND not currently recording */}
          {combinedIsLoading && !isRecording && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}
        </View>

        {/* Main Controls Area */}
        <View style={styles.controlsContainer}>
          {/* Styled Record Button Component */}
          <RecordButton isRecording={isRecording} onPress={handleRecordPress} />

          {/* Playback section for the LATEST recording */}
          {recordingUri && !combinedIsLoading && (
            <View style={styles.playbackContainer}>
              <Text style={styles.infoText} numberOfLines={1} ellipsizeMode="middle">
                Ready: {recordingUri.split('/').pop()}
              </Text>
              {/* Styled Play/Pause button for latest recording */}
              <TouchableOpacity
                style={[styles.playPauseButton, (isPlaying && currentlyPlayingUri === recordingUri) ? styles.pauseButtonActive : styles.playButtonIdle]}
                onPress={handlePlaybackPress} // Handles play/pause for latest recording
                disabled={combinedIsLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.playPauseButtonText}>{(isPlaying && currentlyPlayingUri === recordingUri) ? '❚❚ Pause' : '▶ Play'}</Text>
              </TouchableOpacity>
            </View>
          )}

          <UploadButton
            recordingUri={recordingUri}
            // Disable upload if recording, playing, loading, or uploading
            isLoading={isRecording || isPlaying || combinedIsLoading}
            onPress={handleUploadPress}
          />
        </View>

        {/* Translation List Component takes remaining space */}
        <TranslationList
          translations={translations}
          isPlaying={isPlaying}
          currentlyPlayingUri={currentlyPlayingUri}
          onItemPress={handleHistoryItemPress} // Pass the single handler for list items
        />
      </View>
    </SafeAreaView>
  );
}

// --- Styles --- (Includes styling improvements)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f4f8', // Lighter blue-grey background
  },
  container: {
    flex: 1,
    alignItems: 'center', // Center items horizontally
    paddingTop: Platform.OS === 'android' ? ((StatusBar?.currentHeight ?? 0) + 15) : 25,
    paddingHorizontal: 15, // Consistent horizontal padding
  },
  title: {
    fontSize: 50, // Increased size for more impact
    fontWeight: '700', // A slightly bolder weight (or 'bold')
    marginBottom: 35, // Increased space below the title
    color: '#34495e', // Slightly different shade of dark blue-grey
    textAlign: 'center',
    // Add a subtle text shadow for depth
    textShadowColor: 'rgba(0, 0, 0, 0.15)', // Shadow color with some transparency
    textShadowOffset: { width: 0, height: 1 }, // Shadow position (1px down)
    textShadowRadius: 2, // How blurry the shadow is
  },
  statusContainer: { // Container for status messages/indicators
    minHeight: 50, // Reserve some space
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 10,
  },
  recordingStatus: {
    fontSize: 16,
    color: '#e74c3c', // Use a slightly different red
    fontWeight: '600', // Semi-bold
  },
  loader: {
    marginVertical: 10, // Adjust spacing
  },
  errorText: {
    color: '#c0392b', // Darker red for errors
    textAlign: 'center',
    paddingHorizontal: 20,
    fontWeight: 'bold',
    fontSize: 14,
    backgroundColor: '#fdd', // Light red background for errors
    padding: 8,
    borderRadius: 5,
    marginBottom: 5, // Add margin below error text
  },
  controlsContainer: { // Group main controls
    width: '90%', // Control width of button area
    alignItems: 'center', // Center buttons within this container
    marginBottom: 20, // Space before list
  },
  playbackContainer: {
    alignItems: 'center',
    marginVertical: 15, // Space around playback controls
    width: '100%', // Take full width within controls container
  },
  infoText: {
    fontStyle: 'italic',
    color: '#7f8c8d', // Greyer text
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  // Style for the main Play/Pause button (latest recording)
  playPauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20, // Rounded corners
    minWidth: 150, // Ensure decent size
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
  },
  playButtonIdle: {
    backgroundColor: '#1abc9c', // Teal color for play
  },
  pauseButtonActive: {
    backgroundColor: '#f39c12', // Orange color for pause
  },
  playPauseButtonText: {
    color: '#ffffff', // White text
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5, // Space after icon if using one
  }
});
