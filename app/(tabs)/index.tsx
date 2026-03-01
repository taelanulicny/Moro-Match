import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeTabScreen() {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.topButton}
        onPress={() => router.push('/search')}
        activeOpacity={0.92}
      >
        <Text style={styles.topButtonText}>Find specific celebrity</Text>
        <Text style={styles.topButtonSubtext}>Search by name</Text>
      </TouchableOpacity>
      <View style={styles.divider} />
      <TouchableOpacity
        style={styles.bottomButton}
        onPress={() => router.push('/random')}
        activeOpacity={0.92}
      >
        <Text style={styles.bottomButtonText}>Randomize</Text>
        <Text style={styles.bottomButtonSubtext}>Show me someone random</Text>
      </TouchableOpacity>
    </View>
  );
}

const HORIZONTAL_MARGIN = 20;
const BUTTON_RADIUS = 20;
const GAP = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff',
    paddingHorizontal: HORIZONTAL_MARGIN,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topButton: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8E8E8',
    borderTopLeftRadius: BUTTON_RADIUS,
    borderTopRightRadius: BUTTON_RADIUS,
    paddingHorizontal: 24,
  },
  topButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  topButtonSubtext: {
    fontSize: 15,
    fontWeight: '500',
    color: '#555',
    marginTop: 6,
  },
  divider: {
    height: GAP,
    backgroundColor: 'transparent',
  },
  bottomButton: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#B0B0C8',
    borderBottomLeftRadius: BUTTON_RADIUS,
    borderBottomRightRadius: BUTTON_RADIUS,
    paddingHorizontal: 24,
  },
  bottomButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  bottomButtonSubtext: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.75)',
    marginTop: 6,
  },
});
