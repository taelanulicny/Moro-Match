import { supabase } from '@/lib/supabase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

type Celebrity = { id: string; name: string; slug: string; image_url: string };

const NUM_COLUMNS = 2;
const PADDING = 16;
const GAP = 12;

export default function ChooseCelebrityScreen() {
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Celebrity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { width: screenWidth } = useWindowDimensions();
  const tileSize = (screenWidth - PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  const filteredCelebrities = celebrities.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const fetchCelebrities = useCallback(async () => {
    setLoading(true);
    const { data, err } = await supabase
      .from('celebrities')
      .select('id, name, slug, image_url')
      .order('name');
    if (!err && data) setCelebrities(data as Celebrity[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCelebrities();
  }, [fetchCelebrities]);

  const handleConfirm = () => {
    if (!selected) return;
    const params = new URLSearchParams({
      celebrityId: selected.id,
      celebrityName: selected.name,
    });
    router.replace(`/upload?${params.toString()}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#333" />
        <Text style={styles.loadingText}>Loading celebrities…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>People tell me I look like…</Text>
        <Text style={styles.subtitle}>Tap a celebrity to select, then confirm.</Text>
        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search celebrities…"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <FlatList
        data={filteredCelebrities}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        key="two-column"
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          searchQuery.trim() ? (
            <View style={styles.emptySearch}>
              <Text style={styles.emptySearchText}>No celebrities match "{searchQuery.trim()}"</Text>
            </View>
          ) : null
        }
        renderItem={({ item: celeb }) => {
          const isSelected = selected?.id === celeb.id;
          return (
            <TouchableOpacity
              style={[
                styles.tile,
                { width: tileSize },
                isSelected && styles.tileSelected,
              ]}
              onPress={() => setSelected(celeb)}
              activeOpacity={0.8}
            >
              <View style={[styles.tileImageWrap, { width: tileSize - 2, height: tileSize - 2 }]}>
                {celeb.image_url ? (
                  <Image
                    source={{ uri: celeb.image_url }}
                    style={styles.tileImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.tilePlaceholder, styles.tileImage]}>
                    <MaterialIcons name="person" size={40} color="#999" />
                  </View>
                )}
                {isSelected && (
                  <View style={styles.tileCheck}>
                    <MaterialIcons name="check" size={24} color="#fff" />
                  </View>
                )}
              </View>
              <Text style={[styles.tileName, isSelected && styles.tileNameSelected]} numberOfLines={2}>
                {celeb.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, !selected && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!selected}
          activeOpacity={0.8}
        >
          <Text style={[styles.confirmButtonText, !selected && styles.confirmButtonTextDisabled]}>
            Confirm
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  emptySearch: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    paddingHorizontal: PADDING,
    paddingTop: 16,
    paddingBottom: 24,
  },
  columnWrapper: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  tile: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileSelected: {
    borderColor: '#000',
  },
  tileImageWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E8E8E8',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tilePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginTop: 8,
    textAlign: 'center',
  },
  tileNameSelected: {
    color: '#000',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  confirmButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCC',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  confirmButtonTextDisabled: {
    color: '#999',
  },
});
