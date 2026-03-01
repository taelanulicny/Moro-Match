import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { useLayoutEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NotificationsTabScreen() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={styles.settingsButton}
        >
          <Text style={styles.settingsButtonText}>Settings</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>No notifications yet.</Text>
      <Text style={styles.hint}>
        When someone likes or matches with you, you{"'"}ll see it here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  settingsButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  settingsButtonText: {
    fontSize: 17,
    color: '#000',
    fontWeight: '500',
  },
  placeholder: {
    fontSize: 17,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
