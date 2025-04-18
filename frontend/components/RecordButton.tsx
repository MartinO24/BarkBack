import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  style?: ViewStyle; // Allow passing custom styles
}

const RecordButton: React.FC<RecordButtonProps> = ({ isRecording, onPress, style }) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isRecording ? styles.buttonRecording : styles.buttonIdle,
        style, // Apply custom styles passed via props
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.iconText}>🎤</Text>
      <Text style={styles.buttonText}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30, // Make it rounded
    marginVertical: 15,
    width: '80%',
    minWidth: 200,
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buttonIdle: {
    backgroundColor: '#28a745', // Green
  },
  buttonRecording: {
    backgroundColor: '#dc3545', // Red
    // Optional: Add pulsing animation later
  },
  iconText: {
    fontSize: 20,
    marginRight: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default RecordButton;

