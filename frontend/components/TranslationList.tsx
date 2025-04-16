import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

// Define the shape of a single translation item for type safety
interface TranslationItem {
  id: string; // Expecting a unique ID for keys
  filename?: string; // Use optional '?' if the data might sometimes miss these fields
  translation?: string;
}

// Define the props for the TranslationList component
interface TranslationListProps {
  translations: TranslationItem[]; // Expect an array of TranslationItem objects
}

const TranslationList: React.FC<TranslationListProps> = ({ translations }) => {

  // Define how each item in the list should be rendered
  // Add type annotation for the 'item' destructured from the renderItem argument
  const renderItem = ({ item }: { item: TranslationItem }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemFilename} numberOfLines={1} ellipsizeMode="middle">
        {/* Use default text if filename is missing */}
        {item.filename || 'Unknown Filename'}
      </Text>
      <Text style={styles.itemTranslation}>
        {/* Use default text if translation is missing */}
        {item.translation || 'No translation available.'}
      </Text>
    </View>
  );

  return (
    // Use a View container; FlatList works within it. flex: 1 helps it take available space.
    <View style={styles.listContainer}>
      <Text style={styles.listTitle}>Translation History</Text>
      {translations.length === 0 ? (
        <Text style={styles.emptyText}>No translations yet.</Text>
      ) : (
        <FlatList
          data={translations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id} // Use the required unique ID
          contentContainerStyle={styles.listContent}
          // Add some visual separation between list items
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    flex: 1, // Make the list take available vertical space
    width: '95%', // Use most of the width
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0', // Lighter separator color
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 12,
    color: '#333',
  },
  listContent: {
    paddingBottom: 20, // Padding at the bottom of the scrollable content
  },
  itemContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 4, // Reduced margin for tighter list
    marginHorizontal: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#eeeeee', // Very light border for subtle separation
     // Add shadow for a slight elevation effect
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.05,
     shadowRadius: 1,
     elevation: 1, // for Android shadow
  },
  itemFilename: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
  },
  itemTranslation: {
    fontSize: 15,
    color: '#000',
  },
  emptyText: {
      textAlign: 'center',
      marginTop: 30,
      color: '#888', // Darker grey for empty text
      fontSize: 16,
  },
  separator: {
      height: 5, // Creates vertical space between items in the list
  }
});

export default TranslationList;