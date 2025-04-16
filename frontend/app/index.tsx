import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Alert, SafeAreaView, StatusBar, Platform, Button } from 'react-native';
import { Audio, InterruptionModeIOS } from 'expo-av';

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

 // --- New State: Track which URI is currently playing ---
 const [currentlyPlayingUri, setCurrentlyPlayingUri] = useState<string | null>(null);

 
 // --- Effect to clear playing URI when playback stops ---
 useEffect(() => {
   // If isPlaying becomes false, clear the currently playing URI marker
   if (!isPlaying) {
     setCurrentlyPlayingUri(null);
   }
   // Note: This doesn't handle cases where playback might fail silently
   // without isPlaying changing, but covers manual stops and natural ends.
 }, [isPlaying]); // Dependency: only run when isPlaying changes

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
       const { recording: newRecording } = await Audio.Recording.createAsync( Audio.RecordingOptionsPresets.HIGH_QUALITY );
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
     // Stop playback via hook before uploading
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
  const combinedIsLoading = isLoading || isUploading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'} />
      <View style={styles.container}>
        <Text style={styles.title}>Animal Sound Translator</Text>

        {error && <Text style={styles.errorText}>Error: {error}</Text>}
        {isRecording && <Text style={styles.recordingStatus}>Recording...</Text>}
        {combinedIsLoading && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}

        <RecordButton isRecording={isRecording} onPress={handleRecordPress} />

        {/* Playback section for the LATEST recording */}
        {recordingUri && !combinedIsLoading && (
            <View style={styles.playbackContainer}>
                <Text style={styles.infoText} numberOfLines={1} ellipsizeMode="middle">
                    Ready: {recordingUri.split('/').pop()}
                </Text>
                <Button
                    // Determine if the LATEST recording is the one playing
                    title={(isPlaying && currentlyPlayingUri === recordingUri) ? '❚❚ Pause' : '▶ Play'}
                    onPress={handlePlaybackPress} // Handles play/pause for latest recording
                    color={(isPlaying && currentlyPlayingUri === recordingUri) ? '#ffc107' : '#17a2b8'}
                    disabled={combinedIsLoading}
                />
            </View>
        )}

        <UploadButton
          recordingUri={recordingUri}
          isLoading={combinedIsLoading}
          onPress={handleUploadPress}
        />

        {/* Translation List - Pass playback state and handler */}
        <TranslationList
            translations={translations}
            // Pass the necessary state and handler for list items
            isPlaying={isPlaying}
            currentlyPlayingUri={currentlyPlayingUri}
            onItemPress={handleHistoryItemPress} // Pass the single handler
        />
      </View>
    </SafeAreaView>
  );
}

// --- Styles --- (Keep styles as they are)
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa', },
  container: { flex: 1, alignItems: 'center', paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 10 : 20, paddingHorizontal: 10, },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#343a40', },
  recordingStatus: { fontSize: 16, color: '#dc3545', fontWeight: 'bold', marginBottom: 10, },
  loader: { marginVertical: 20, },
  errorText: { color: '#dc3545', marginVertical: 10, textAlign: 'center', paddingHorizontal: 20, fontWeight: 'bold' },
  playbackContainer: { alignItems: 'center', marginVertical: 10, width: '80%', },
  infoText: { fontStyle: 'italic', color: 'grey', fontSize: 12, textAlign: 'center', marginBottom: 5, },
});
