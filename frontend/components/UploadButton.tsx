import React from 'react';
import { Button, StyleSheet, View } from 'react-native';

// Define props interface
interface UploadButtonProps {
    recordingUri: string | null; // Can be a string (URI) or null
    isLoading: boolean;
    onPress: () => void; // Function takes no arguments, returns nothing
}

const UploadButton: React.FC<UploadButtonProps> = ({ recordingUri, isLoading, onPress }) => {
  // Enable button only if there's a recording URI AND we are not currently loading/busy
  const canUpload = recordingUri !== null && !isLoading;

  return (
    <View style={styles.buttonContainer}>
      <Button
        title="Translate Recording"
        onPress={onPress}
        disabled={!canUpload}
        color="#007bff" // Blue color
      />
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    marginVertical: 10,
     width: '80%',
     minWidth: 200, // Ensure button isn't too small
  },
});

export default UploadButton;