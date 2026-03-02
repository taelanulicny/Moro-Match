import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

export default function ResultsScreen() {
  const { selfieUrl } = useLocalSearchParams<{ selfieUrl?: string }>();
  const { width: screenWidth } = useWindowDimensions();
  const horizontalPadding = 24;
  const cardWidth = screenWidth - horizontalPadding * 2;
  const cardTopHeight = cardWidth / 0.75;

  const [dbUser, setDbUser] = useState<{
    selfie_url: string | null;
    selected_celebrity_id: string | null;
    similarity_score: number | null;
    is_match: boolean | null;
    confidence: string | null;
    celebrities?: { id: string; name: string; slug: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setDbUser(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('users')
      .select('selfie_url, selected_celebrity_id, similarity_score, is_match, confidence, celebrities(id, name, slug)')
      .eq('auth_id', session.user.id)
      .maybeSingle();

    if (!error && data) {
      setDbUser(data);
    } else {
      setDbUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const celebrity = dbUser?.celebrities
    ? { id: dbUser.celebrities.id, name: dbUser.celebrities.name, slug: dbUser.celebrities.slug }
    : null;

  const photoUrl = selfieUrl ?? dbUser?.selfie_url ?? null;
  const similarityScore = dbUser?.similarity_score ?? null;
  const isMatch = dbUser?.is_match ?? false;
  const confidence = dbUser?.confidence ?? null;

  const handleFindNextBest = () => {
    router.replace('/(tabs)');
  };

  const handleTryDifferentPhoto = () => {
    router.push('/upload');
  };

  if (loading && !dbUser) {
    return (
      <View style={[styles.center, styles.container]}>
        <ActivityIndicator size="large" color="#333" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={[styles.card, { width: cardWidth, alignSelf: 'center' }]}>
            <View style={[styles.cardTop, { width: cardWidth, height: cardTopHeight }]}>
              {photoUrl ? (
                <Image
                  source={{ uri: photoUrl }}
                  style={[styles.cardImage, { width: cardWidth, height: cardTopHeight }]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.cardPlaceholder, { width: cardWidth, height: cardTopHeight }]} />
              )}
            </View>
            <View style={styles.cardBottom}>
              {celebrity ? (
                <Text style={styles.cardCeleb} numberOfLines={1}>
                  {celebrity.name}
                </Text>
              ) : null}
              {similarityScore != null ? (
                <Text style={styles.cardScore}>
                  {Math.round(Number(similarityScore) * 100)}% similar
                </Text>
              ) : null}
              {isMatch != null && (
                <Text style={styles.cardMatch}>
                  {isMatch ? 'Match' : 'No match'}
                </Text>
              )}
              {confidence ? (
                <Text style={styles.cardConfidence} numberOfLines={1}>
                  {confidence}
                </Text>
              ) : null}
            </View>
          </View>

          <Text style={styles.previewLabel}>This is how you'll appear to others</Text>

          <TouchableOpacity
            style={styles.tryDifferentButton}
            onPress={handleTryDifferentPhoto}
            activeOpacity={0.8}
          >
            <Text style={styles.tryDifferentButtonText}>
              Don{"'"}t agree? Try a different photo
            </Text>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleFindNextBest}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Find my match</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },
  keyboard: {
    flex: 1,
    backgroundColor: '#fff',
    width: '100%',
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  container: {
    paddingTop: 24,
    width: '100%',
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  cardTop: {
    backgroundColor: '#E8E8E8',
    overflow: 'hidden',
  },
  cardImage: {
    backgroundColor: '#E8E8E8',
  },
  cardPlaceholder: {
    backgroundColor: '#E8E8E8',
  },
  cardBottom: {
    minHeight: 76,
    backgroundColor: '#B0B0C8',
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCeleb: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  cardScore: {
    fontSize: 15,
    color: 'rgba(0,0,0,0.85)',
    marginBottom: 2,
  },
  cardMatch: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.75)',
    marginBottom: 2,
  },
  cardConfidence: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.65)',
  },
  previewLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  tryDifferentButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 28,
    alignSelf: 'center',
  },
  tryDifferentButtonText: {
    fontSize: 16,
    color: '#666',
    textDecorationLine: 'underline',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
