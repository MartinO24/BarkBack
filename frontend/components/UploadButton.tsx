import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';

interface UploadButtonProps {
    recordingUri: string | null;
    isLoading: boolean;
    onPress: () => void;
    style?: ViewStyle;
}

const UploadButton: React.FC<UploadButtonProps> = ({ recordingUri, isLoading, onPress, style }) => {
  const canUpload = recordingUri !== null && !isLoading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        !canUpload ? styles.buttonDisabled : styles.buttonEnabled, // Style based on disabled state
        style,
      ]}
      onPress={onPress}
      disabled={!canUpload}
      activeOpacity={0.7}
    >
      <Text style={styles.iconText}>⬆️</Text>
      <Text style={styles.buttonText}>Translate Sound</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
 button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    marginVertical: 10,
    width: '80%',
    minWidth: 200,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
  },
  buttonEnabled: {
     backgroundColor: '#007bff', // Blue
  },
  buttonDisabled: {
     backgroundColor: '#cccccc', // Grey out when disabled
  },
  iconText: {
    fontSize: 18,
    marginRight: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default UploadButton;
