import React from 'react';
import { FlatList, StyleSheet, Text, View, Button } from 'react-native'; // Import Button

// Define the shape of a single translation item, including URI
interface TranslationItem {
  id: string;
  filename?: string;
  translation?: string;
  uri: string; // Expect URI for playback
}

// Define the props for the component
interface TranslationListProps {
  translations: TranslationItem[];
  onItemPress: (uri: string) => void; // Handler called when button is pressed
  isPlaying: boolean; // NEW PROP: Is any audio currently playing?
  currentlyPlayingUri: string | null; // NEW PROP: Which URI is playing?
}

const TranslationList: React.FC<TranslationListProps> = ({
    translations,
    onItemPress,
    isPlaying,            // <-- Destructure new prop
    currentlyPlayingUri   // <-- Destructure new prop
}) => {

  // Define how each item in the list should be rendered
  const renderItem = ({ item }: { item: TranslationItem }) => {
    // --- CHANGE START: Determine if THIS item is playing ---
    // Check if global playback is active AND the playing URI matches this item's URI
    const isThisItemPlaying = isPlaying && currentlyPlayingUri === item.uri;
    // --- CHANGE END ---

    return (
        <View style={styles.itemContainer}>
            {/* View to hold the text content */}
            <View style={styles.textContent}>
                <Text style={styles.itemFilename} numberOfLines={1} ellipsizeMode="middle">
                    {item.filename || 'Unknown Filename'}
                </Text>
                <Text style={styles.itemTranslation}>
                    {item.translation || 'No translation available.'}
                </Text>
            </View>
            {/* Add a Play/Pause Button */}
            <View style={styles.buttonWrapper}>
                <Button
                    // --- CHANGE START: Set title conditionally ---
                    title={isThisItemPlaying ? '❚❚ Pause' : '▶ Play'}
                    // --- CHANGE END ---
                    // --- Pressing always calls the same handler from parent ---
                    // --- Parent handler decides whether to play or stop ---
                    onPress={() => onItemPress(item.uri)}
                    // --- CHANGE START: Set color conditionally ---
                    color={isThisItemPlaying ? '#ffc107' : '#17a2b8'} // Yellow for pause, Teal for play
                    // --- CHANGE END ---
                />
            </View>
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
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

// --- Styles --- (Styles remain the same as the previous version with the row layout)
const styles = StyleSheet.create({
  listContainer: { flex: 1, width: '95%', marginTop: 20, borderTopWidth: 1, borderTopColor: '#e0e0e0', },
  listTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginVertical: 12, color: '#333', },
  listContent: { paddingBottom: 20, },
  itemContainer: { backgroundColor: '#ffffff', paddingVertical: 8, paddingHorizontal: 15, marginVertical: 4, marginHorizontal: 5, borderRadius: 5, borderWidth: 1, borderColor: '#eeeeee', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', },
  textContent: { flex: 1, marginRight: 10, },
  itemFilename: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 3, },
  itemTranslation: { fontSize: 15, color: '#000', },
  buttonWrapper: { /* Optional styling */ },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#888', fontSize: 16, },
  separator: { height: 5, }
});

export default TranslationList;
