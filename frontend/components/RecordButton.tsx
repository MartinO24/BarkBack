import React from 'react';
import { Button, StyleSheet, View } from 'react-native';

// Define props interface for TypeScript
interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void; // Function that takes no arguments and returns nothing
}

const RecordButton: React.FC<RecordButtonProps> = ({ isRecording, onPress }) => {
  return (
    <View style={styles.buttonContainer}>
      <Button
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
        onPress={onPress}
        color={isRecording ? '#dc3545' : '#28a745'} // Red when recording, Green when not
      />
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    marginVertical: 15,
    width: '80%',
    minWidth: 200, // Ensure button isn't too small
  },
});

export default RecordButton;