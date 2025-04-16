import { useState, useEffect, useRef } from 'react';
import { Audio, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';

// Define the return type of the hook
interface UseAudioPlayerReturn {
    playAudio: (uri: string) => Promise<void>; // Function to start playback, throws error on failure
    stopPlayback: () => Promise<void>; // Function to stop playback, throws error on failure
    isPlaying: boolean; // State indicating if playback is active
}

/**
 * Custom hook to manage audio playback using expo-av.
 */
export function useAudioPlayer(): UseAudioPlayerReturn {
    const [playbackInstance, setPlaybackInstance] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    // Use a ref to prevent setting state after unmount in callbacks
    const isMounted = useRef(true);

    // Cleanup effect when the component using the hook unmounts
    useEffect(() => {
        isMounted.current = true; // Set mounted state on mount
        // Return cleanup function
        return () => {
            isMounted.current = false; // Set false on unmount
            console.log("AudioPlayer Hook: Unmounting, unloading sound...");
            // Unload sound if it exists when component unmounts
            playbackInstance?.unloadAsync().catch(e => console.error("AudioPlayer Hook: Error unloading sound on unmount:", e));
        };
    }, [playbackInstance]); // Rerun effect if playbackInstance changes

    // Function to stop and unload the current playback instance
    const stopPlayback = async () => {
        if (!playbackInstance) {
            // console.log("AudioPlayer Hook: No playback instance to stop.");
            return; // Nothing to stop
        }
        console.log('AudioPlayer Hook: Stopping playback...');
        try {
            // Check if it's still loaded before stopping/unloading
            const status = await playbackInstance.getStatusAsync();
            if (status.isLoaded) {
                await playbackInstance.stopAsync(); // Stop playback
                await playbackInstance.unloadAsync(); // Unload sound resources
                console.log('AudioPlayer Hook: Playback stopped and unloaded.');
            } else {
                 console.log('AudioPlayer Hook: Instance was already unloaded.');
            }
        } catch (error: any) {
            console.error('AudioPlayer Hook: Error stopping/unloading playback:', error);
            // Re-throw the error for the component to handle if needed
            throw new Error(`Stop Playback Failed: ${error.message}`);
        } finally {
            // Only update state if component is still mounted
            if (isMounted.current) {
                setPlaybackInstance(null);
                setIsPlaying(false);
            }
        }
    };

    // Function to load and play audio from a URI
    const playAudio = async (uri: string) => {
        console.log('AudioPlayer Hook: Attempting to play audio from:', uri);

        // Stop any currently playing audio first
        if (isPlaying) {
            console.log("AudioPlayer Hook: Stopping previous playback first.");
            await stopPlayback();
        }

        try {
            // Set audio mode for playback (important on iOS)
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true, // Allow playback even if phone is on silent
                interruptionModeIOS: InterruptionModeIOS.DoNotMix, // Or MIX_WITH_OTHERS
                // Add Android modes if needed
                // interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
                // shouldDuckAndroid: true, // Example
                // playThroughEarpieceAndroid: false // Example
            });

            console.log('AudioPlayer Hook: Loading Sound...');
            const { sound, status } = await Audio.Sound.createAsync(
               { uri: uri },
               { shouldPlay: true } // Tell it to play immediately after loading
            );

            // Check if loading was successful (status might be useful)
            if (!status.isLoaded) {
                // This case might indicate an issue with the URI or file format
                throw new Error("Sound could not be loaded. Check URI and file format.");
            }

            console.log('AudioPlayer Hook: Sound Loaded, setting up status updates.');
            // Only update state if component is still mounted
            if (isMounted.current) {
                setPlaybackInstance(sound); // Store the new sound instance
                setIsPlaying(true); // Set playing state
            } else {
                // If component unmounted while loading, unload immediately
                 console.log("AudioPlayer Hook: Component unmounted during load, unloading sound.");
                 sound.unloadAsync();
                 return;
            }


            // Add listener for playback status updates
            sound.setOnPlaybackStatusUpdate((playbackStatus) => {
                if (!playbackStatus.isLoaded) {
                    // Handle unload or error during playback
                    if (playbackStatus.error) {
                         console.error(`AudioPlayer Hook: Playback Error Update: ${playbackStatus.error}`);
                         // Don't throw here, just reset state if mounted
                         if (isMounted.current) {
                             setIsPlaying(false);
                             setPlaybackInstance(null); // Clear instance as it errored/unloaded
                         }
                    } else {
                         // Playback unloaded without error (e.g., by stopPlayback)
                         // State should already be handled by stopPlayback
                    }
                    return; // Stop processing if not loaded
                }

                // Update isPlaying state based on the status (if mounted)
                if (isMounted.current) {
                     setIsPlaying(playbackStatus.isPlaying);
                }


                // Handle natural finish
                if (playbackStatus.didJustFinish) {
                    console.log("AudioPlayer Hook: Playback finished naturally.");
                    // Don't unload here if we want to allow replaying without reloading
                    // sound.unloadAsync(); // Optional: unload when finished
                    if (isMounted.current) {
                        setIsPlaying(false);
                        // Keep the instance loaded if you want replay capability,
                        // otherwise unload and set to null:
                        // setPlaybackInstance(null);
                    }
                }
            });

            console.log('AudioPlayer Hook: Playing Sound...');

        } catch (error: any) {
            console.error('AudioPlayer Hook: Failed to load or play sound:', error);
            // Clean up instance on error if it exists
            if (playbackInstance && isMounted.current) {
                await playbackInstance.unloadAsync().catch(e => {}); // Ignore unload error
                setPlaybackInstance(null);
            }
             if (isMounted.current) {
                setIsPlaying(false); // Ensure playing is false
             }
            // Re-throw the error for the component to handle
            throw new Error(`Playback Failed: ${error.message}`);
        }
    };

    // Return the functions and state needed by the component
    return { playAudio, stopPlayback, isPlaying };
}
