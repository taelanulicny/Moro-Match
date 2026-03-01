import { formatGender, MOCK_CURRENT_USER_ID, getCelebrityById, getUserById } from '@/data/mockData';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

export default function PublicProfileScreen() {
  const { id, bio, instagram, tiktok } = useLocalSearchParams<{
    id: string;
    bio?: string;
    instagram?: string;
    tiktok?: string;
  }>();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const user = id ? getUserById(id) : null;
  const celebrity = user ? getCelebrityById(user.matchedCelebrityId) : null;

  const isOwnProfile = id === MOCK_CURRENT_USER_ID;
  const displayBio = isOwnProfile && bio !== undefined ? bio : user?.bio ?? null;
  const displayInstagram = isOwnProfile && instagram !== undefined ? instagram : user?.instagramHandle ?? null;
  const displayTiktok = isOwnProfile && tiktok !== undefined ? tiktok : user?.tiktokHandle ?? null;
  const showSocials = isOwnProfile
    ? (displayInstagram != null && displayInstagram !== '') || (displayTiktok != null && displayTiktok !== '')
    : user?.socialsVisible ?? false;

  const contentWidth = screenWidth - 48;
  const thumbSize = Math.min(100, (contentWidth - 16) / 3);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Profile not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getSocialUrl = (value: string, platform: 'instagram' | 'tiktok') => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    const handle = trimmed.replace(/^@/, '');
    return platform === 'instagram'
      ? `https://www.instagram.com/${encodeURIComponent(handle)}`
      : `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
  };

  const getSocialLabel = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const url = new URL(trimmed);
        const path = url.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
        if (path) return path.startsWith('@') ? path : `@${path}`;
      } catch {
        return trimmed.length > 25 ? trimmed.slice(0, 22) + '…' : trimmed;
      }
    }
    return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
  };

  const handleSocialPress = (value: string, platform: 'instagram' | 'tiktok') => {
    const url = getSocialUrl(value, platform);
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open', `We couldn't open ${platform}.`);
    });
  };

  const handlePoke = () => {
    Alert.alert(
      "Poke sent!",
      `${user.displayName} will get a notification that someone thinks they could be your match on Moro.`
    );
  };

  const photos = user.additionalPhotoUrls ?? [];
  const hasAdditionalPhotos = photos.length > 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Main picture - full width */}
      <View style={[styles.mainImageWrap, { width: screenWidth, height: screenWidth }]}>
        {user.selfieUrl ? (
          <Image source={{ uri: user.selfieUrl }} style={[styles.mainImage, { width: screenWidth, height: screenWidth }]} resizeMode="cover" />
        ) : (
          <View style={[styles.mainImage, { width: screenWidth, height: screenWidth }]} />
        )}
      </View>
      <View style={styles.container}>

        {/* Additional pictures */}
        <View style={styles.photosSection}>
          <Text style={styles.sectionTitle}>Photos</Text>
          {hasAdditionalPhotos ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosRow}
            >
              {photos.map((url, i) => (
                <View key={i} style={[styles.thumb, { width: thumbSize, height: thumbSize }]}>
                  <Image source={{ uri: url }} style={[styles.thumbImage, { width: thumbSize, height: thumbSize }]} resizeMode="cover" />
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.muted}>No additional photos yet.</Text>
          )}
        </View>

        {/* Name, age, celebrity */}
        <Text style={styles.name} numberOfLines={2}>{user.displayName}</Text>
        <Text style={styles.age}>
          {formatGender(user.gender)} · {user.age} years old
        </Text>
        <View style={styles.matchRow}>
          <Text style={styles.matchLabel}>Matched celebrity</Text>
          <Text style={styles.matchValue}>
            {celebrity?.name ? `${celebrity.name} (${user.similarityPercent}%)` : user.similarityPercent === 0 ? `No face detected (${user.similarityPercent}%)` : `— (${user.similarityPercent}%)`}
          </Text>
        </View>

        {!isOwnProfile && (
          <TouchableOpacity
            style={styles.pokeButton}
            onPress={handlePoke}
            activeOpacity={0.8}
          >
            <Text style={styles.pokeButtonText}>Think they{"'"}re your match?</Text>
            <Text style={styles.pokeButtonSubtext}>Poke them — they{"'"}ll get a notification</Text>
          </TouchableOpacity>
        )}

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.label}>Bio</Text>
          {(displayBio != null && displayBio !== '') ? (
            <Text style={styles.bio}>{displayBio}</Text>
          ) : (
            <Text style={styles.muted}>No bio yet.</Text>
          )}
        </View>

        {/* Linked socials */}
        <View style={styles.section}>
          <Text style={styles.label}>Socials</Text>
          {showSocials ? (
            <>
              {displayInstagram ? (
                <TouchableOpacity
                  onPress={() => handleSocialPress(displayInstagram, 'instagram')}
                  style={styles.socialRow}
                >
                  <Text style={styles.socialLink} numberOfLines={1}>
                    Instagram: {getSocialLabel(displayInstagram)}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {displayTiktok ? (
                <TouchableOpacity
                  onPress={() => handleSocialPress(displayTiktok, 'tiktok')}
                  style={styles.socialRow}
                >
                  <Text style={styles.socialLink} numberOfLines={1}>
                    TikTok: {getSocialLabel(displayTiktok)}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {!displayInstagram && !displayTiktok && (
                <Text style={styles.muted}>No handles added</Text>
              )}
            </>
          ) : (
            <Text style={styles.muted}>Socials hidden</Text>
          )}
        </View>

        <Text style={styles.disclaimer}>
          Entertainment only. Not affiliated with any celebrity.
        </Text>
      </View>
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
  error: {
    fontSize: 17,
    color: '#666',
    marginBottom: 16,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontSize: 17,
    color: '#000',
    fontWeight: '600',
  },
  mainImageWrap: {
    marginBottom: 20,
    overflow: 'hidden',
  },
  mainImage: {
    backgroundColor: '#E8E8E8',
  },
  photosSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  photosRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 24,
  },
  thumb: {
    backgroundColor: '#E5E5E5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbImage: {
    borderRadius: 8,
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
    marginBottom: 8,
  },
  matchRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  matchLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  matchValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  pokeButton: {
    width: '100%',
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 28,
  },
  pokeButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  pokeButtonSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase',
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
});
