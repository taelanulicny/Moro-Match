import {
  MOCK_CURRENT_USER_ID,
  getCelebrityById,
  MOCK_USERS,
} from '@/data/mockData';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const INSTAGRAM_ASPECT = 5 / 4; // 4:5 portrait (width : height)

export default function RandomScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const randomUsers = useMemo(
    () => shuffle(MOCK_USERS.filter((u) => u.id !== MOCK_CURRENT_USER_ID)),
    []
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);

  const user = randomUsers[currentIndex];
  const celebrity = user ? getCelebrityById(user.matchedCelebrityId) : null;

  const photos = useMemo(() => {
    if (!user) return [];
    const list = [user.selfieUrl, ...(user.additionalPhotoUrls ?? [])].filter(
      (u): u is string => typeof u === 'string' && u.length > 0
    );
    return list;
  }, [user?.id]);

  useEffect(() => {
    setPhotoIndex(0);
  }, [user?.id]);

  const currentPhoto = photos[photoIndex] ?? null;
  const hasMultiplePhotos = photos.length > 1;
  const canGoPrev = hasMultiplePhotos && photoIndex > 0;
  const canGoNext = hasMultiplePhotos && photoIndex < photos.length - 1;

  const handleNextUser = () => {
    setCurrentIndex((prev) => (prev + 1) % randomUsers.length);
    setPhotoIndex(0);
  };

  const handlePoke = () => {
    if (!user) return;
    Alert.alert(
      "Poke sent!",
      `${user.displayName} will get a notification that someone thinks they could be your match on Moro Match.`,
      [{ text: "OK", onPress: handleNextUser }]
    );
  };

  const handleViewProfile = () => {
    if (user) router.push(`/profile/${user.id}`);
  };

  const handlePrevPhoto = () => {
    if (canGoPrev) setPhotoIndex((i) => i - 1);
  };

  const handleNextPhoto = () => {
    if (canGoNext) setPhotoIndex((i) => i + 1);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>No other users to show right now.</Text>
      </View>
    );
  }

  const cardWidth = screenWidth - 48; // 24 padding each side
  const cardTopHeight = cardWidth * INSTAGRAM_ASPECT; // 4:5 portrait (Instagram-style)

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.imageWrap, { width: cardWidth, height: cardTopHeight }]}>
            {currentPhoto ? (
              <Image
                source={{ uri: currentPhoto }}
                style={[styles.cardImage, { width: cardWidth, height: cardTopHeight }]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.cardImagePlaceholder, { width: cardWidth, height: cardTopHeight }]} />
            )}
            {hasMultiplePhotos && (
              <>
                <TouchableOpacity
                  style={[styles.photoNavLeft, { width: cardWidth / 2, height: cardTopHeight }]}
                  onPress={handlePrevPhoto}
                  activeOpacity={1}
                  disabled={!canGoPrev}
                />
                <TouchableOpacity
                  style={[styles.photoNavRight, { width: cardWidth / 2, height: cardTopHeight }]}
                  onPress={handleNextPhoto}
                  activeOpacity={1}
                  disabled={!canGoNext}
                />
              </>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.cardBottom} onPress={handleViewProfile} activeOpacity={0.9}>
          <Text style={styles.name}>{user.displayName}, {user.age}</Text>
          {user.bio ? (
            <Text style={styles.bio} numberOfLines={1}>
              {user.bio}
            </Text>
          ) : null}
          <Text style={styles.celebrityName}>
            {celebrity?.name ? `${celebrity.name} · ${user.similarityPercent}%` : user.similarityPercent === 0 ? 'No face detected' : `— · ${user.similarityPercent}%`}
          </Text>
          <Text style={styles.tapProfileHint}>Tap to view full profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.pokeButton}
          onPress={handlePoke}
          activeOpacity={0.8}
        >
          <Text style={styles.pokeButtonText}>Poke</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNextUser}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.disclaimer}>
        Entertainment only. Not affiliated with any celebrity.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  empty: {
    fontSize: 17,
    color: "#666",
    textAlign: "center",
  },
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 24,
  },
  cardTop: {
    flex: 1,
    backgroundColor: "#E8E8E8",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  imageWrap: {
    position: "relative",
    overflow: "hidden",
  },
  cardImage: {
    backgroundColor: "#E8E8E8",
  },
  cardImagePlaceholder: {
    backgroundColor: "#E8E8E8",
  },
  photoNavLeft: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  photoNavRight: {
    position: "absolute",
    right: 0,
    top: 0,
  },
  cardBottom: {
    height: 90,
    backgroundColor: "#B0B0C8",
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardPercent: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  bio: {
    fontSize: 13,
    color: "rgba(0,0,0,0.75)",
    marginBottom: 4,
    fontStyle: "italic",
  },
  celebrityName: {
    fontSize: 14,
    color: "rgba(0,0,0,0.8)",
  },
  tapProfileHint: {
    fontSize: 12,
    color: "rgba(0,0,0,0.6)",
    marginTop: 6,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  pokeButton: {
    flex: 1,
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  pokeButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
  },
  nextButton: {
    flex: 1,
    backgroundColor: "#B0B0C8",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  disclaimer: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
});
