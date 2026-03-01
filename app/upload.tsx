import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  useWindowDimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const BUCKET = 'Avatars';

export default function UploadSelfieScreen() {
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const horizontalPadding = 24;
  const contentWidth = screenWidth - horizontalPadding * 2;
  const photoSize = Math.min(contentWidth, 400);

  const hasImage = !!pickedUri;

  const requestLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photos to upload a selfie.');
      return false;
    }
    return true;
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to take a selfie.');
      return false;
    }
    return true;
  };

  const pickImage = async (source: 'camera' | 'library') => {
    setError(null);
    try {
      const ok = source === 'camera'
        ? await requestCameraPermission()
        : await requestLibraryPermission();
      if (!ok) return;

      const options = {
        mediaTypes: ['images'] as const,
        allowsEditing: true,
        aspect: [1, 1] as [number, number],
        quality: 0.8,
        base64: true,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      };

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (!asset.uri) {
        setError('Could not get photo.');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Sign in to upload your selfie.');
        return;
      }

      setPickedUri(asset.uri);
      setUploading(true);

      const rawExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const ext = rawExt === 'heic' || rawExt === 'heif' ? 'jpg' : rawExt;
      const path = `${user.id}/selfie_${Date.now()}.${ext}`;

      if (!asset.base64) throw new Error('Could not read image file');
      const binary = atob(asset.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const arrayBuffer = bytes.buffer;
      if (arrayBuffer.byteLength === 0) throw new Error('Could not read image file');

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, arrayBuffer, {
          contentType: asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const { error: updateErr } = await supabase
        .from('users')
        .update({ selfie_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('auth_id', user.id);

      if (updateErr) throw updateErr;

      // Trigger face match (Clarifai Edge Function) — await so we can log and surface errors
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const fnUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/face-match`;
        try {
          const fnRes = await fetch(fnUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ imageUrl: publicUrl, authId: user.id }),
          });
          const body = await fnRes.text();
          if (!fnRes.ok) {
            console.warn('[face-match]', fnRes.status, body);
          } else {
            console.log('[face-match]', fnRes.status, body);
          }
        } catch (e) {
          console.warn('[face-match] request failed', e);
        }
      }

      const { data: existing } = await supabase
        .from('user_photos')
        .select('id, display_order')
        .eq('auth_id', user.id)
        .order('display_order', { ascending: true });
      for (let i = (existing?.length ?? 0) - 1; i >= 0; i--) {
        await supabase.from('user_photos').update({ display_order: i + 1 }).eq('id', existing![i].id);
      }
      await supabase.from('user_photos').insert({
        auth_id: user.id,
        storage_path: path,
        display_order: 0,
      });

      setUploadedUrl(publicUrl);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Upload failed.';
      setError(message);
      Alert.alert('Upload', message);
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = () => {
    router.replace({
      pathname: '/results',
      params: uploadedUrl ? { selfieUrl: uploadedUrl } : undefined,
    });
  };

  const showPickOptions = () => {
    Alert.alert(
      'Add your selfie',
      'Take a photo or choose from your gallery.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take selfie', onPress: () => pickImage('camera') },
        { text: 'Choose from gallery', onPress: () => pickImage('library') },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingHorizontal: horizontalPadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Find your celebrity match</Text>
        <Text style={styles.subtitle}>
          Upload a clear selfie — we{"'"}ll tell you who you look like.
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.photoArea,
          hasImage && styles.photoAreaFilled,
          { width: photoSize, height: photoSize, alignSelf: 'center' },
        ]}
        onPress={showPickOptions}
        activeOpacity={0.92}
        disabled={uploading}
      >
        {uploading ? (
          <View style={styles.uploadingWrap}>
            <ActivityIndicator size="large" color="#333" />
            <Text style={styles.uploadingText}>Uploading…</Text>
          </View>
        ) : hasImage && pickedUri ? (
          <Image
            source={{ uri: pickedUri }}
            style={[styles.previewImage, { width: photoSize, height: photoSize }]}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.photoInner}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="add-a-photo" size={40} color="#999" />
            </View>
            <Text style={styles.photoLabel}>Tap to add your selfie</Text>
            <Text style={styles.photoHint}>Take a photo or choose from gallery</Text>
          </View>
        )}
      </TouchableOpacity>

      {uploadedUrl ? (
        <View style={styles.successRow}>
          <MaterialIcons name="check-circle" size={20} color="#22c55e" />
          <Text style={styles.successText}>
            Photo uploaded. Tap to change or continue.
          </Text>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={styles.tips}>
        For best results, use a front-facing photo with your face clearly visible.
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={showPickOptions}
          activeOpacity={0.8}
          disabled={uploading}
        >
          <MaterialIcons name="photo-camera" size={20} color="#000" style={styles.buttonIcon} />
          <Text style={styles.secondaryButtonText}>
            {hasImage ? 'Take new selfie or choose different photo' : 'Take selfie or choose from gallery'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, (!hasImage || !uploadedUrl) && styles.primaryButtonDisabled]}
          onPress={handleContinue}
          activeOpacity={0.8}
          disabled={!hasImage || !uploadedUrl || uploading}
        >
          <Text
            style={[
              styles.primaryButtonText,
              (!hasImage || !uploadedUrl) && styles.primaryButtonTextDisabled,
            ]}
          >
            See my match
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
    paddingTop: 8,
    width: '100%',
  },
  header: {
    marginBottom: 28,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    lineHeight: 22,
  },
  photoArea: {
    backgroundColor: '#F8F8F8',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  photoAreaFilled: {
    backgroundColor: '#E8E8E8',
    borderColor: '#D0D0D0',
  },
  photoInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    borderRadius: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  photoLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  photoHint: {
    fontSize: 14,
    color: '#888',
  },
  uploadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    fontSize: 16,
    color: '#555',
    marginTop: 12,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    color: '#333',
  },
  errorText: {
    fontSize: 14,
    color: '#C00',
    marginBottom: 12,
    textAlign: 'center',
  },
  tips: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  buttonIcon: {
    marginRight: 8,
  },
  secondaryButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '600',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#000',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#D4D4D4',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  primaryButtonTextDisabled: {
    color: '#9CA3AF',
  },
});
