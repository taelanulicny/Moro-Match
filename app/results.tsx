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
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 20;

export default function ResultsScreen() {
  const { selfieUrl } = useLocalSearchParams<{ selfieUrl?: string }>();
  const { width: screenWidth } = useWindowDimensions();
  const horizontalPadding = 24;
  const cardWidth = screenWidth - horizontalPadding * 2;
  const cardTopHeight = cardWidth / 0.75;

  const [dbUser, setDbUser] = useState<{
    display_name: string;
    age: number | null;
    selfie_url: string | null;
    bio: string | null;
    instagram_handle: string | null;
    tiktok_handle: string | null;
    matched_celebrity_id: string | null;
    matched_celebrity_name: string | null;
    similarity_percent: number | null;
    celebrities?: { id: string; name: string; slug: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [findingMatch, setFindingMatch] = useState(false);
  const [bio, setBio] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setDbUser(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('users')
      .select('display_name, age, selfie_url, bio, instagram_handle, tiktok_handle, matched_celebrity_id, matched_celebrity_name, similarity_percent, celebrities(id, name, slug)')
      .eq('auth_id', session.user.id)
      .maybeSingle();

    if (!error && data) {
      setDbUser(data);
      setBio(data.bio ?? '');
      setInstagramHandle(data.instagram_handle ?? '');
      setTiktokHandle(data.tiktok_handle ?? '');
    } else {
      setDbUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Poll for match when we have no match yet (just uploaded)
  useEffect(() => {
    if (!dbUser || loading) return;
    const hasMatch = dbUser.matched_celebrity_id || dbUser.matched_celebrity_name || (dbUser.similarity_percent ?? 0) > 0;
    if (hasMatch) {
      setFindingMatch(false);
      return;
    }
    setFindingMatch(true);
    let attempts = 0;
    const id = setInterval(async () => {
      attempts++;
      if (attempts >= POLL_MAX_ATTEMPTS) {
        setFindingMatch(false);
        clearInterval(id);
        return;
      }
      await fetchUser();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loading, fetchUser, dbUser?.matched_celebrity_id, dbUser?.matched_celebrity_name, dbUser?.similarity_percent]);

  const celebrity = dbUser?.celebrities
    ? { id: dbUser.celebrities.id, name: dbUser.celebrities.name, slug: dbUser.celebrities.slug }
    : dbUser?.matched_celebrity_name
      ? { id: '', name: dbUser.matched_celebrity_name, slug: '' }
      : null;

  const photoUrl = selfieUrl ?? dbUser?.selfie_url ?? null;
  const displayName = dbUser?.display_name ?? 'You';
  const age = dbUser?.age ?? 18;
  const oneLineBio = (bio.trim() || dbUser?.bio) ?? '';
  const similarityPercent = dbUser?.similarity_percent ?? 0;

  const handleSaveProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    setSaving(true);
    await supabase
      .from('users')
      .update({
        bio: bio.trim() || null,
        instagram_handle: instagramHandle.trim() || null,
        tiktok_handle: tiktokHandle.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_id', session.user.id);
    setSaving(false);
  };

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
        keyboardShouldPersistTaps="handled"
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
              <Text style={styles.cardName} numberOfLines={1}>
                {displayName}, {age}
              </Text>
              {oneLineBio ? (
                <Text style={styles.cardBio} numberOfLines={1}>
                  {oneLineBio}
                </Text>
              ) : null}
              <Text style={styles.cardCeleb} numberOfLines={1}>
                {findingMatch ? (
                  'Finding your match…'
                ) : !celebrity?.name && similarityPercent === 0 ? (
                  'No face detected. Try a clear front-facing selfie.'
                ) : (
                  `${celebrity?.name ?? '—'} · ${similarityPercent}%`
                )}
              </Text>
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

          <View style={styles.profileSection}>
            <Text style={styles.profileSectionTitle}>Set up your profile</Text>
            <Text style={styles.profileSectionHint}>
              Optional. Add a bio and paste your profile links. Others can tap to open your Instagram or TikTok.
            </Text>
            <Text style={styles.inputLabel}>Bio</Text>
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              placeholder="A short bio about you..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
            <Text style={styles.inputLabel}>Instagram</Text>
            <TextInput
              style={styles.input}
              value={instagramHandle}
              onChangeText={setInstagramHandle}
              placeholder="Paste your Instagram profile link"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.inputLabel}>TikTok</Text>
            <TextInput
              style={styles.input}
              value={tiktokHandle}
              onChangeText={setTiktokHandle}
              placeholder="Paste your TikTok profile link"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save profile</Text>
              )}
            </TouchableOpacity>
          </View>

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
  profileSection: {
    width: '100%',
    marginBottom: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  profileSectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  profileSectionHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#000',
    marginBottom: 16,
    backgroundColor: '#fff',
    width: '100%',
  },
  bioInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#000',
    marginBottom: 16,
    backgroundColor: '#fff',
    width: '100%',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
