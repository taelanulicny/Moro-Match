import type { Gender, MockUser } from '@/data/mockData';
import {
  formatGender,
  MOCK_CURRENT_USER_ID,
  getUserById,
} from '@/data/mockData';
import {
  getPublicUrlFromPath,
  getStoragePathFromPublicUrl,
  isValidImageUrl,
} from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
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
import DraggableFlatList from 'react-native-draggable-flatlist';
import { MaterialIcons } from '@expo/vector-icons';

const BUCKET = 'Avatars';

const PLACEHOLDER_PREFIX = 'mock://placeholder-';

function isPlaceholder(uri: string) {
  return uri.startsWith(PLACEHOLDER_PREFIX);
}

function ProfilePhotoImage({
  uri,
  size,
  fullWidth,
  onError,
}: {
  uri: string;
  fallbackUri?: string;
  size: number;
  fullWidth?: boolean;
  onError?: () => void;
}) {
  const [loadFailed, setLoadFailed] = useState(false);

  if (!isValidImageUrl(uri) && !isPlaceholder(uri)) {
    return <View style={[styles.thumbPlaceholder, { width: size, height: size }]} />;
  }

  if (loadFailed) {
    return <View style={[styles.thumbPlaceholder, { width: size, height: size }]} />;
  }

  return (
    <Image
      key={uri}
      source={uri}
      style={[
        fullWidth ? styles.mainImage : styles.thumb,
        { width: size, height: size },
      ]}
      contentFit="cover"
      onError={() => {
        setLoadFailed(true);
        onError?.();
      }}
      onLoad={() => {
        if (uri) console.log('[ProfilePhotoImage] Loaded:', uri.slice(0, 80) + '...');
      }}
    />
  );
}

export default function SelfProfileTabScreen() {
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const mockUser = getUserById(MOCK_CURRENT_USER_ID);

  type UserPhoto = { id: string; storage_path: string; display_order: number };

  const [dbUser, setDbUser] = useState<{
    display_name: string;
    age: number | null;
    gender: string | null;
    selfie_url: string | null;
    bio: string | null;
    instagram_handle: string | null;
    tiktok_handle: string | null;
    matched_celebrity_id: string | null;
    matched_celebrity_name: string | null;
    similarity_percent: number | null;
    celebrities?: { id: string; name: string; slug: string } | null;
  } | null>(null);
  const [userPhotos, setUserPhotos] = useState<UserPhoto[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const fetchProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setDbUser(null);
      setUserPhotos([]);
      setProfileLoaded(true);
      return;
    }
    const authId = session.user.id;

    const [usersRes, photosRes] = await Promise.all([
      supabase.from('users').select('display_name, age, gender, selfie_url, bio, instagram_handle, tiktok_handle, matched_celebrity_id, matched_celebrity_name, similarity_percent, celebrities(id, name, slug)').eq('auth_id', authId).maybeSingle(),
      supabase.from('user_photos').select('id, storage_path, display_order').eq('auth_id', authId).order('display_order', { ascending: true }),
    ]);

    if (!usersRes.error && usersRes.data) setDbUser(usersRes.data);
    else setDbUser(null);

    if (!photosRes.error && photosRes.data?.length) {
      setUserPhotos(photosRes.data as UserPhoto[]);
    } else {
      setUserPhotos([]);
    }
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useFocusEffect(
    useCallback(() => {
      if (profileLoaded) fetchProfile();
    }, [profileLoaded, fetchProfile])
  );

  const user: MockUser | null = useMemo(() => {
    if (!mockUser) return null;
    if (!profileLoaded) return null;
    if (!dbUser) return mockUser;
    const mainUrl = userPhotos[0] ? null : (dbUser.selfie_url ?? mockUser.selfieUrl);
    const matchedId = dbUser.matched_celebrity_id ?? mockUser.matchedCelebrityId;
    const similarity = dbUser.similarity_percent ?? mockUser.similarityPercent;
    return {
      ...mockUser,
      displayName: dbUser.display_name || mockUser.displayName,
      age: dbUser.age ?? mockUser.age,
      gender: (dbUser.gender as Gender) ?? mockUser.gender,
      selfieUrl: mainUrl ?? mockUser.selfieUrl,
      additionalPhotoUrls: [],
      matchedCelebrityId: matchedId,
      similarityPercent: similarity,
      bio: dbUser.bio ?? mockUser.bio,
      instagramHandle: dbUser.instagram_handle ?? mockUser.instagramHandle,
      tiktokHandle: dbUser.tiktok_handle ?? mockUser.tiktokHandle,
    };
  }, [mockUser, dbUser, profileLoaded, userPhotos]);

  const celebrityFromJoin = dbUser?.celebrities;
  const celebrityName = celebrityFromJoin?.name ?? dbUser?.matched_celebrity_name ?? null;
  const celebrity = user ? (celebrityFromJoin ?? (celebrityName ? { id: '', name: celebrityName, slug: '' } : null)) : null;

  const initialPhotos = useMemo(() => {
    return [...userPhotos].sort((a, b) => a.display_order - b.display_order);
  }, [userPhotos.map((p) => p.id).join(',')]);

  const [orderedPhotos, setOrderedPhotos] = useState<UserPhoto[]>(initialPhotos);
  const [photosModifiedByUser, setPhotosModifiedByUser] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [editModal, setEditModal] = useState<'bio' | 'socials' | null>(null);
  const [editBio, setEditBio] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editTiktok, setEditTiktok] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!profileLoaded) return;
    setOrderedPhotos([...userPhotos].sort((a, b) => a.display_order - b.display_order));
    setPhotosModifiedByUser(false);
  }, [profileLoaded, userPhotos.map((p) => `${p.id}-${p.display_order}`).join(',')]);

  const displayPhotos = (photosModifiedByUser || orderedPhotos.length > 0) ? orderedPhotos : initialPhotos;
  const mainPhotoPath = displayPhotos[0]?.storage_path ?? null;
  const fallbackSelfiePath = !mainPhotoPath && dbUser?.selfie_url ? getStoragePathFromPublicUrl(dbUser.selfie_url) : null;
  const mainDisplayPath = mainPhotoPath ?? fallbackSelfiePath;
  const thumbSize = Math.min(88, (screenWidth - 24 * 2 - 8 * 3) / 4);

  const [displayUrls, setDisplayUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const paths = [
      ...displayPhotos.map((p) => p.storage_path),
      ...(fallbackSelfiePath ? [fallbackSelfiePath] : []),
    ].filter(Boolean);
    if (paths.length === 0) {
      setDisplayUrls({});
      return;
    }
    const result: Record<string, string> = {};
    for (const path of paths) {
      result[path] = getPublicUrlFromPath(path);
    }
    setDisplayUrls((prev) => ({ ...prev, ...result }));
  }, [displayPhotos.map((p) => p.storage_path).join(','), fallbackSelfiePath ?? '']);

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

  const handleSetAsMain = (index: number) => {
    if (index === 0) return;
    const source = (photosModifiedByUser || orderedPhotos.length > 0) ? orderedPhotos : initialPhotos;
    const next = [...source];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    setOrderedPhotos(next);
    setPhotosModifiedByUser(true);
  };

  const persistPhotoOrder = useCallback(async (newOrder: UserPhoto[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    for (let i = 0; i < newOrder.length; i++) {
      await supabase
        .from('user_photos')
        .update({ display_order: i })
        .eq('id', newOrder[i].id);
    }
    setUserPhotos([...newOrder].map((p, i) => ({ ...p, display_order: i })));
  }, []);

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
      if (editModal === 'bio') {
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
  }, [editModal, editBio, editInstagram, editTiktok]);

  const requestPhotoPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Allow access to your photos to add pictures to your profile.'
      );
      return false;
    }
    return true;
  }, []);

  const handleAddPhoto = useCallback(async () => {
    const ok = await requestPhotoPermission();
    if (!ok) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      Alert.alert('Sign in required', 'Sign in to add photos to your profile.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.8,
        base64: true,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });

      if (result.canceled || !result.assets?.length) return;

      const assets = result.assets.filter((a) => a.uri && a.base64);
      if (!assets.length) {
        Alert.alert('Error', 'Could not get photos. Try selecting fewer or smaller images.');
        return;
      }

      setAddingPhoto(true);

      const source = (photosModifiedByUser || orderedPhotos.length > 0) ? orderedPhotos : initialPhotos;
      const newPhotos: UserPhoto[] = [];
      const newDisplayUrlsMap: Record<string, string> = {};
      const nextDisplayOrder = source.length;

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const rawExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const ext = rawExt === 'heic' || rawExt === 'heif' ? 'jpg' : rawExt;
        const path = `${session.user.id}/photo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;

        const arrayBuffer = asset.base64
          ? (() => {
              const binary = atob(asset.base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              return bytes.buffer;
            })()
          : null;

        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          console.warn('[handleAddPhoto] No image data for', path);
          continue;
        }

        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, arrayBuffer, {
            contentType: asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
            upsert: true,
          });

        if (uploadErr) {
          console.warn('[handleAddPhoto] Upload failed for path:', path, uploadErr);
          continue;
        }

        const { data: insertData, error: insertErr } = await supabase
          .from('user_photos')
          .insert({
            auth_id: session.user.id,
            storage_path: path,
            display_order: nextDisplayOrder + i,
          })
          .select('id, storage_path, display_order')
          .single();

        if (insertErr) {
          console.warn('[handleAddPhoto] DB insert failed for path:', path, insertErr);
          continue;
        }

        const publicUrl = getPublicUrlFromPath(path);
        if (!isValidImageUrl(publicUrl)) {
          console.warn('[handleAddPhoto] Invalid public URL for path:', path);
          continue;
        }

        const photo: UserPhoto = {
          id: insertData.id,
          storage_path: insertData.storage_path,
          display_order: insertData.display_order,
        };
        newPhotos.push(photo);
        newDisplayUrlsMap[path] = publicUrl;

        console.log('[handleAddPhoto] Uploaded photo:', { path, url: publicUrl.slice(0, 60) + '...' });
      }

      if (newPhotos.length === 0) {
        Alert.alert('Error', 'Could not upload photos. Please try again.');
        setAddingPhoto(false);
        return;
      }

      const nextOrdered = [...source, ...newPhotos];
      setOrderedPhotos(nextOrdered);
      setPhotosModifiedByUser(true);
      setDisplayUrls((prev) => ({ ...prev, ...newDisplayUrlsMap }));
      setUserPhotos((prev) => [...prev, ...newPhotos]);

      await fetchProfile();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to add photo.';
      console.error('[handleAddPhoto] Error:', e);
      Alert.alert('Error', message);
    } finally {
      setAddingPhoto(false);
    }
  }, [initialPhotos, orderedPhotos, photosModifiedByUser, requestPhotoPermission, fetchProfile]);

  const handleRemovePhoto = (index: number) => {
    Alert.alert(
      'Remove photo',
      'Remove this photo from your profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const source = (photosModifiedByUser || orderedPhotos.length > 0) ? orderedPhotos : initialPhotos;
            const photoToRemove = source[index];
            if (!photoToRemove) return;

            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
              setOrderedPhotos(source.filter((_, i) => i !== index));
              setPhotosModifiedByUser(true);
              return;
            }

            await supabase.storage.from(BUCKET).remove([photoToRemove.storage_path]);
            await supabase.from('user_photos').delete().eq('id', photoToRemove.id);

            const newOrdered = source.filter((_, i) => i !== index).map((p, i) => ({ ...p, display_order: i }));
            for (let i = 0; i < newOrdered.length; i++) {
              await supabase.from('user_photos').update({ display_order: i }).eq('id', newOrdered[i].id);
            }
            setOrderedPhotos(newOrdered);
            setPhotosModifiedByUser(true);
            setUserPhotos(newOrdered);
            await fetchProfile();
          },
        },
      ]
    );
  };

  if (!profileLoaded) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.emptyText}>Loading…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Profile not found.</Text>
      </View>
    );
  }

  const displayBio = user.bio ?? null;
  const displayInstagram = user.instagramHandle ?? null;
  const displayTiktok = user.tiktokHandle ?? null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Main photo - full width, outside padded container */}
      <View style={[styles.mainWrap, { width: screenWidth, height: screenWidth }]}>
        {mainDisplayPath && displayUrls[mainDisplayPath] ? (
          <ProfilePhotoImage
            uri={displayUrls[mainDisplayPath]}
            size={screenWidth}
            fullWidth
            onError={() => console.warn('[ProfilePhotoImage] Failed to load main:', mainDisplayPath)}
          />
        ) : (
          <View style={[styles.mainPlaceholder, StyleSheet.absoluteFill]} />
        )}
      </View>

      <View style={styles.container}>
        {/* Photo strip: tap to set as main, add photo */}
        <View style={styles.photosSection}>
          <View style={styles.photosSectionHeader}>
            <Text style={styles.photosSectionTitle}>Your photos</Text>
            <Text style={styles.photosHint}>Drag to reorder · tap to set as main</Text>
          </View>
          <View style={[styles.photosListWrap, { height: thumbSize }]}>
            <DraggableFlatList
              data={displayPhotos}
              keyExtractor={(item) => item.id}
              extraData={displayPhotos.length}
              horizontal
              onDragEnd={({ data }) => {
                const reordered = data.map((p, i) => ({ ...p, display_order: i }));
                setOrderedPhotos(reordered);
                setPhotosModifiedByUser(true);
                persistPhotoOrder(reordered);
              }}
              renderItem={({ item: photo, getIndex, drag, isActive }) => {
                const index = getIndex() ?? 0;
                const imageUri = displayUrls[photo.storage_path];
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleSetAsMain(index)}
                    onLongPress={drag}
                    delayLongPress={200}
                    style={[
                      styles.thumbWrap,
                      { width: thumbSize, height: thumbSize },
                      isActive && styles.thumbWrapDragging,
                    ]}
                  >
                    {imageUri ? (
                      <ProfilePhotoImage
                        uri={imageUri}
                        size={thumbSize}
                        onError={() => console.warn('[ProfilePhotoImage] Failed to load:', photo.storage_path)}
                      />
                    ) : (
                      <View style={[styles.thumb, styles.thumbPlaceholder]} />
                    )}
                    {index === 0 && (
                      <View style={styles.mainBadge}>
                        <Text style={styles.mainBadgeText}>Main</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRemovePhoto(index);
                      }}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="close" size={18} color="#fff" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
              ListFooterComponent={
                <TouchableOpacity
                  onPress={handleAddPhoto}
                  style={[styles.addPhotoBtn, { width: thumbSize, height: thumbSize }]}
                  activeOpacity={0.7}
                  disabled={addingPhoto}
                >
                  {addingPhoto ? (
                    <ActivityIndicator size="small" color="#999" />
                  ) : (
                    <>
                      <MaterialIcons name="add" size={32} color="#999" />
                      <Text style={styles.addPhotoLabel}>Add</Text>
                    </>
                  )}
                </TouchableOpacity>
              }
              contentContainerStyle={styles.photosRow}
            />
          </View>
        </View>

        <Text style={styles.name} numberOfLines={2}>
          {user.displayName}
        </Text>
        <Text style={styles.age}>
          {formatGender(user.gender)} · {user.age} years old
        </Text>
        <View style={styles.section}>
          <Text style={styles.label}>Matched Celebrity</Text>
          <Text style={styles.value} numberOfLines={2}>
            {user.similarityPercent > 0
              ? `${celebrity?.name ?? '—'} (${user.similarityPercent}%)`
              : 'No face detected'}
          </Text>
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
                  <Text style={styles.socialLink} numberOfLines={1}>Instagram: {displayInstagram.startsWith('http') ? 'Tap to open' : `@${displayInstagram.replace(/^@/, '')}`}</Text>
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
                  <Text style={styles.socialLink} numberOfLines={1}>TikTok: {displayTiktok.startsWith('http') ? 'Tap to open' : `@${displayTiktok.replace(/^@/, '')}`}</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <Text style={styles.muted}>No handles added.</Text>
          )}
        </View>
        <Text style={styles.disclaimer}>
          Entertainment only. Not affiliated with any celebrity.
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
              {editModal === 'bio' ? 'Edit Bio' : 'Edit Socials'}
            </Text>
            {editModal === 'bio' ? (
              <TextInput
                style={[styles.modalInput, styles.modalInputMultiline]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Tell people about yourself..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
            ) : (
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
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 0,
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
  photosSection: {
    marginBottom: 24,
  },
  photosSectionHeader: {
    marginBottom: 10,
  },
  photosSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  photosHint: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  photosListWrap: {
    width: '100%',
  },
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  thumbWrap: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbWrapDragging: {
    opacity: 0.9,
    zIndex: 1,
  },
  thumb: {
    borderRadius: 8,
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    backgroundColor: '#E5E5E5',
  },
  mainBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mainBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBtn: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  age: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
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
  tryDifferentLink: {
    marginTop: 8,
    paddingVertical: 4,
  },
  tryDifferentLinkText: {
    fontSize: 15,
    color: '#666',
    textDecorationLine: 'underline',
  },
  value: {
    fontSize: 17,
    color: '#000',
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
