import React from 'react';
import { FlatList, StyleSheet, Text, View, TouchableOpacity } from 'react-native'; // Import TouchableOpacity

// Define the shape of a single translation item
interface TranslationItem {
  id: string;
  filename?: string;
  translation?: string;
  uri: string;
}

// Define the props for the component
interface TranslationListProps {
  translations: TranslationItem[];
  onItemPress: (uri: string) => void;
  isPlaying: boolean;
  currentlyPlayingUri: string | null;
}

const TranslationList: React.FC<TranslationListProps> = ({
    translations,
    onItemPress,
    isPlaying,
    currentlyPlayingUri
}) => {

  const renderItem = ({ item }: { item: TranslationItem }) => {
    const isThisItemPlaying = isPlaying && currentlyPlayingUri === item.uri;

    return (
        // Card container for each item
        <View style={styles.card}>
            {/* View to hold the text content */}
            <View style={styles.textContent}>
                <Text style={styles.itemFilename} numberOfLines={1} ellipsizeMode="middle">
                    {item.filename || 'Unknown Filename'}
                </Text>
                <Text style={styles.itemTranslation}>
                    {item.translation || 'No translation available.'}
                </Text>
            </View>
            {/* Use TouchableOpacity for custom styled button */}
            <TouchableOpacity
                style={[styles.playButton, isThisItemPlaying ? styles.pauseButtonActive : styles.playButtonIdle]}
                onPress={() => onItemPress(item.uri)}
                activeOpacity={0.7}
            >
                 {/* Using Unicode symbols for Play/Pause */}
                 <Text style={styles.playButtonText}>{isThisItemPlaying ? '❚❚' : '▶'}</Text>
            </TouchableOpacity>
        </View>
    );
  }; // End renderItem

  return (
    <View style={styles.listContainer}>
      <Text style={styles.listTitle}>Translation History</Text>
      {translations.length === 0 ? (
        <Text style={styles.emptyText}>No translations yet.</Text>
      ) : (
        <FlatList
          data={translations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          // Removed ItemSeparatorComponent, card margins handle spacing
        />
      )}
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  listContainer: {
    flex: 1, // Take remaining space
    width: '100%', // Use full width
    marginTop: 25,
    // Removed top border, cards provide separation
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600', // Semi-bold
    textAlign: 'center',
    marginVertical: 15,
    color: '#444', // Darker grey
  },
  listContent: {
    paddingHorizontal: 10, // Add horizontal padding to the list container
    paddingBottom: 20,
  },
  card: { // Style for each history item card
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 6, // Vertical space between cards
    // Shadows
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    // Layout
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContent: {
    flex: 1, // Allow text to take available space
    marginRight: 15, // Space between text and button
  },
  itemFilename: {
    fontSize: 13,
    fontWeight: '500', // Medium weight
    color: '#666', // Medium grey
    marginBottom: 4,
  },
  itemTranslation: {
    fontSize: 16,
    color: '#111', // Darker text
    fontWeight: '400', // Regular weight
  },
  playButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20, // Make it round
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40, // Ensure minimum touch area
    minHeight: 40,
  },
  playButtonIdle: {
     backgroundColor: '#e0f7fa', // Light cyan background for play
  },
  pauseButtonActive: {
     backgroundColor: '#fff3e0', // Light orange background for pause
  },
  playButtonText: {
    fontSize: 18, // Larger symbol
    color: '#007bff', // Blue symbol color
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#888',
    fontSize: 16,
    fontStyle: 'italic',
  },
  // separator removed, margin on card handles spacing
});

export default TranslationList;
