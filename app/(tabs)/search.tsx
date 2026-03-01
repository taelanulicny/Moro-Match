import {
  getCelebrityById,
  getUsersByCelebrityId,
  MOCK_CELEBRITIES,
  MOCK_USERS,
} from '@/data/mockData';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

const SEARCH_PLACEHOLDER = 'e.g. Leonardo DiCaprio';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const { width: screenWidth } = useWindowDimensions();
  const horizontalPadding = 16;
  const gap = 12;
  const cardWidth = (screenWidth - horizontalPadding * 2 - gap) / 2;

  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, '-');
  const matchedCeleb = MOCK_CELEBRITIES.find(
    (c) =>
      c.slug.includes(normalizedQuery) ||
      c.name.toLowerCase().includes(query.trim().toLowerCase())
  );
  const usersToShow = matchedCeleb
    ? getUsersByCelebrityId(matchedCeleb.id)
    : [];

  const renderUser = ({ item }: { item: (typeof MOCK_USERS)[0] }) => {
    const celeb = getCelebrityById(item.matchedCelebrityId);
    return (
      <TouchableOpacity
        style={[styles.card, { width: cardWidth }]}
        onPress={() => router.push(`/profile/${item.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.cardTop} />
        <View style={styles.cardBottom}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.displayName}, {item.age}
          </Text>
          {item.bio ? (
            <Text style={styles.cardBio} numberOfLines={1}>
              {item.bio}
            </Text>
          ) : null}
          <Text style={styles.cardCeleb} numberOfLines={1}>
            {celeb?.name ? `${celeb.name} · ${item.similarityPercent}%` : item.similarityPercent === 0 ? 'No face detected' : `— · ${item.similarityPercent}%`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Find a specific celebrity lookalike</Text>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder={SEARCH_PLACEHOLDER}
        placeholderTextColor="#999"
        returnKeyType="search"
        autoFocus
      />
      {!query.trim() && (
        <>
          <Text style={styles.suggestLabel}>Try searching for</Text>
          <View style={styles.chipRow}>
            {MOCK_CELEBRITIES.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.chip}
                onPress={() => setQuery(c.name)}
                activeOpacity={0.8}
              >
                <Text style={styles.chipText}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
      {query.trim() ? (
        usersToShow.length > 0 ? (
          <FlatList
            data={usersToShow}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <Text style={styles.empty}>No lookalikes found for that celebrity.</Text>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  search: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#000',
    marginBottom: 16,
  },
  suggestLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#E8E8E8',
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  empty: {
    fontSize: 16,
    color: '#666',
  },
  list: {
    paddingBottom: 32,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardTop: {
    aspectRatio: 0.75,
    backgroundColor: '#E8E8E8',
  },
  cardBottom: {
    height: 76,
    backgroundColor: '#B0B0C8',
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  cardBio: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.75)',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  cardCeleb: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.85)',
  },
});
