import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function SelfProfileTabScreen() {
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();

  const [dbUser, setDbUser] = useState<{
    display_name: string | null;
    bio: string | null;
    instagram_handle: string | null;
    tiktok_handle: string | null;
    selfie_url: string | null;
    selected_celebrity_id: string | null;
    similarity_score: number | null;
    is_match: boolean | null;
    confidence: string | null;
    celebrities?: { id: string; name: string; slug: string } | null;
  } | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [editModal, setEditModal] = useState<'displayName' | 'bio' | 'socials' | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editTiktok, setEditTiktok] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setDbUser(null);
      setProfileLoaded(true);
      return;
    }
    const { data, error } = await supabase
      .from('users')
      .select('display_name, bio, instagram_handle, tiktok_handle, selfie_url, selected_celebrity_id, similarity_score, is_match, confidence, celebrities(id, name, slug)')
      .eq('auth_id', session.user.id)
      .maybeSingle();

    if (!error && data) {
      setDbUser(data);
    } else {
      setDbUser(null);
    }
    setProfileLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (profileLoaded) fetchProfile();
    }, [profileLoaded, fetchProfile])
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={styles.settingsButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="settings" size={22} color="#000" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const openEditDisplayName = useCallback(() => {
    setEditDisplayName(dbUser?.display_name ?? '');
    setEditModal('displayName');
  }, [dbUser?.display_name]);

  const openEditBio = useCallback(() => {
    setEditBio(dbUser?.bio ?? '');
    setEditModal('bio');
  }, [dbUser?.bio]);

  const openEditSocials = useCallback(() => {
    setEditInstagram(dbUser?.instagram_handle ?? '');
    setEditTiktok(dbUser?.tiktok_handle ?? '');
    setEditModal('socials');
  }, [dbUser?.instagram_handle, dbUser?.tiktok_handle]);

  const saveEdit = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    setSavingEdit(true);
    try {
      if (editModal === 'displayName') {
        const { error } = await supabase
          .from('users')
          .update({ display_name: editDisplayName.trim() || null, updated_at: new Date().toISOString() })
          .eq('auth_id', session.user.id);
        if (!error) setDbUser((p) => (p ? { ...p, display_name: editDisplayName.trim() || null } : null));
      } else if (editModal === 'bio') {
        const { error } = await supabase
          .from('users')
          .update({ bio: editBio.trim() || null, updated_at: new Date().toISOString() })
          .eq('auth_id', session.user.id);
        if (!error) setDbUser((p) => (p ? { ...p, bio: editBio.trim() || null } : null));
      } else if (editModal === 'socials') {
        const { error } = await supabase
          .from('users')
          .update({
            instagram_handle: editInstagram.trim() || null,
            tiktok_handle: editTiktok.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('auth_id', session.user.id);
        if (!error) setDbUser((p) => (p ? { ...p, instagram_handle: editInstagram.trim() || null, tiktok_handle: editTiktok.trim() || null } : null));
      }
      setEditModal(null);
    } finally {
      setSavingEdit(false);
    }
  }, [editModal, editDisplayName, editBio, editInstagram, editTiktok]);

  if (!profileLoaded) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.emptyText}>Loading…</Text>
      </View>
    );
  }

  if (!dbUser) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Sign in to see your profile.</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/auth')} activeOpacity={0.8}>
          <Text style={styles.signInBtnText}>Sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const celebrity = dbUser.celebrities ?? null;
  const selfieUrl = dbUser.selfie_url ?? null;
  const similarityScore = dbUser.similarity_score ?? null;
  const isMatch = dbUser.is_match ?? null;
  const confidence = dbUser.confidence ?? null;
  const displayName = dbUser.display_name?.trim() || 'Add display name';
  const displayBio = dbUser.bio ?? null;
  const displayInstagram = dbUser.instagram_handle ?? null;
  const displayTiktok = dbUser.tiktok_handle ?? null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.mainWrap, { width: screenWidth, height: screenWidth }]}>
        {selfieUrl ? (
          <Image
            source={{ uri: selfieUrl }}
            style={[styles.mainImage, { width: screenWidth, height: screenWidth }]}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.mainPlaceholder, StyleSheet.absoluteFill]} />
        )}
      </View>

      <View style={styles.container}>
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.label}>Display name</Text>
            <TouchableOpacity onPress={openEditDisplayName} style={styles.editBtn} hitSlop={8}>
              <MaterialIcons name="edit" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
        </View>

        {celebrity ? (
          <Text style={styles.celebrityName} numberOfLines={2}>
            {celebrity.name}
          </Text>
        ) : null}
        {similarityScore != null ? (
          <Text style={styles.similarity}>
            {Math.round(Number(similarityScore) * 100)}% similar
          </Text>
        ) : null}
        {isMatch != null && (
          <Text style={styles.matchLabel}>
            {isMatch ? 'Match' : 'No match'}
          </Text>
        )}
        {confidence ? (
          <Text style={styles.confidence} numberOfLines={2}>
            {confidence}
          </Text>
        ) : null}

        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => router.push('/upload')}
            style={styles.tryDifferentLink}
            activeOpacity={0.8}
          >
            <Text style={styles.tryDifferentLinkText}>
              Try a different selfie
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.label, styles.labelInRow]}>Bio</Text>
            <TouchableOpacity onPress={openEditBio} style={styles.editBtn} hitSlop={8}>
              <MaterialIcons name="edit" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          {(displayBio != null && displayBio !== '') ? (
            <Text style={styles.bio}>{displayBio}</Text>
          ) : (
            <Text style={styles.muted}>No bio yet.</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.label, styles.labelInRow]}>Socials</Text>
            <TouchableOpacity onPress={openEditSocials} style={styles.editBtn} hitSlop={8}>
              <MaterialIcons name="edit" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          {(displayInstagram != null && displayInstagram !== '') || (displayTiktok != null && displayTiktok !== '') ? (
            <>
              {displayInstagram ? (
                <TouchableOpacity
                  onPress={() => {
                    const v = displayInstagram.trim();
                    if (!v) return;
                    const url = v.startsWith('http://') || v.startsWith('https://')
                      ? v
                      : `https://www.instagram.com/${encodeURIComponent(v.replace(/^@/, ''))}`;
                    Linking.openURL(url).catch(() => Alert.alert('Could not open Instagram'));
                  }}
                  style={styles.socialRow}
                >
                  <Text style={styles.socialLink} numberOfLines={1}>
                    Instagram: {displayInstagram.startsWith('http') ? 'Tap to open' : `@${displayInstagram.replace(/^@/, '')}`}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {displayTiktok ? (
                <TouchableOpacity
                  onPress={() => {
                    const v = displayTiktok.trim();
                    if (!v) return;
                    const url = v.startsWith('http://') || v.startsWith('https://')
                      ? v
                      : `https://www.tiktok.com/@${encodeURIComponent(v.replace(/^@/, ''))}`;
                    Linking.openURL(url).catch(() => Alert.alert('Could not open TikTok'));
                  }}
                  style={styles.socialRow}
                >
                  <Text style={styles.socialLink} numberOfLines={1}>
                    TikTok: {displayTiktok.startsWith('http') ? 'Tap to open' : `@${displayTiktok.replace(/^@/, '')}`}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <Text style={styles.muted}>No handles added.</Text>
          )}
        </View>

        <Text style={styles.disclaimer}>
          Moro Match is for entertainment only. We are not affiliated with any celebrity.
        </Text>
      </View>

      <Modal visible={editModal !== null} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setEditModal(null)}
          />
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>
              {editModal === 'displayName' ? 'Edit display name' : editModal === 'bio' ? 'Edit bio' : 'Edit socials'}
            </Text>
            {editModal === 'displayName' && (
              <TextInput
                style={styles.modalInput}
                value={editDisplayName}
                onChangeText={setEditDisplayName}
                placeholder="Your display name"
                placeholderTextColor="#999"
                autoCapitalize="words"
              />
            )}
            {editModal === 'bio' && (
              <TextInput
                style={[styles.modalInput, styles.modalInputMultiline]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Tell people about yourself..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
            )}
            {editModal === 'socials' && (
              <>
                <TextInput
                  style={styles.modalInput}
                  value={editInstagram}
                  onChangeText={setEditInstagram}
                  placeholder="Instagram handle or URL"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={styles.modalInput}
                  value={editTiktok}
                  onChangeText={setEditTiktok}
                  placeholder="TikTok handle or URL"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditModal(null)}
                disabled={savingEdit}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={saveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#fff',
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 17,
    color: '#666',
  },
  settingsButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  mainWrap: {
    alignSelf: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  mainImage: {
    backgroundColor: '#E8E8E8',
  },
  mainPlaceholder: {
    backgroundColor: '#E8E8E8',
  },
  section: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  editBtn: {
    padding: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  labelInRow: {
    marginBottom: 0,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  celebrityName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  similarity: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  matchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  confidence: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  tryDifferentLink: {
    paddingVertical: 4,
    alignSelf: 'center',
  },
  tryDifferentLinkText: {
    fontSize: 15,
    color: '#666',
    textDecorationLine: 'underline',
  },
  bio: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  socialRow: {
    marginTop: 4,
  },
  socialLink: {
    fontSize: 16,
    color: '#000',
    textDecorationLine: 'underline',
  },
  muted: {
    fontSize: 15,
    color: '#999',
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    marginTop: 24,
  },
  signInBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  signInBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  modalInputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
