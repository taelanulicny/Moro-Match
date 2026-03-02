import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type DiscoveryGender = 'everyone' | 'men' | 'women';

export default function SettingsScreen() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [discoveryGender, setDiscoveryGender] = useState<DiscoveryGender>('everyone');
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('99');

  const handleUpgrade = () => {
    // Mock: would open Stripe / paywall
  };

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const handleDeleteAccount = () => {
    // Mock: would show confirmation and call API
  };

  const genderOptions: { value: DiscoveryGender; label: string }[] = [
    { value: 'everyone', label: 'Everyone' },
    { value: 'men', label: 'Men' },
    { value: 'women', label: 'Women' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Push Notifications */}
          <View style={styles.section}>
            <Text style={styles.label}>Notifications</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Push notifications</Text>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{ false: '#E0E0E0', true: '#B0B0C8' }}
                thumbColor="#fff"
              />
            </View>
            <Text style={styles.hint}>
              Get notified when someone pokes you or shows interest.
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Discovery preferences */}
          <View style={styles.section}>
            <Text style={styles.label}>Discovery preferences</Text>
            <Text style={styles.sectionDesc}>
              Who you see in Randomize and Search
            </Text>
            <View style={styles.chipRow}>
              {genderOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setDiscoveryGender(opt.value)}
                  style={[
                    styles.chip,
                    discoveryGender === opt.value && styles.chipActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      discoveryGender === opt.value && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.ageRow}>
              <View style={styles.ageField}>
                <Text style={styles.ageLabel}>Min age</Text>
                <TextInput
                  style={styles.ageInput}
                  value={ageMin}
                  onChangeText={setAgeMin}
                  keyboardType="number-pad"
                  placeholder="18"
                  placeholderTextColor="#999"
                  maxLength={3}
                />
              </View>
              <Text style={styles.ageSeparator}>–</Text>
              <View style={styles.ageField}>
                <Text style={styles.ageLabel}>Max age</Text>
                <TextInput
                  style={styles.ageInput}
                  value={ageMax}
                  onChangeText={setAgeMax}
                  keyboardType="number-pad"
                  placeholder="99"
                  placeholderTextColor="#999"
                  maxLength={3}
                />
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.label}>Subscription</Text>
            <Text style={styles.status}>Free Tier</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleUpgrade}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                Upgrade to Premium – $1/month
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.logOutButton}
            onPress={handleLogOut}
            activeOpacity={0.8}
          >
            <Text style={styles.logOutButtonText}>Log out</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
          >
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
          <Text style={styles.disclaimer}>
            Moro Match is for entertainment only. We are not affiliated with any
            celebrity. No endorsement implied.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    backgroundColor: '#fff',
  },
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
    paddingTop: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sectionDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 17,
    color: '#000',
  },
  hint: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  chipActive: {
    backgroundColor: '#B0B0C8',
    borderColor: '#B0B0C8',
  },
  chipText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  ageField: {
    flex: 1,
  },
  ageLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  ageInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 17,
    color: '#000',
    backgroundColor: '#fff',
  },
  ageSeparator: {
    fontSize: 17,
    color: '#666',
    marginBottom: 12,
  },
  status: {
    fontSize: 17,
    color: '#000',
    marginBottom: 16,
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
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 24,
  },
  logOutButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
  },
  logOutButtonText: {
    fontSize: 17,
    color: '#000',
    fontWeight: '500',
  },
  dangerButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 17,
    color: '#C00',
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    marginTop: 32,
    lineHeight: 18,
  },
});
