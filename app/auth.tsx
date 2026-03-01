import type { Gender } from '@/data/mockData';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const MIN_AGE = 18;
const MAX_AGE = 120;

export default function AuthScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isLoginOnly = mode === 'login';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ageNum = age.trim() === '' ? null : parseInt(age.trim(), 10);
  const ageValid =
    ageNum !== null &&
    !isNaN(ageNum) &&
    ageNum >= MIN_AGE &&
    ageNum <= MAX_AGE;
  const ageUnder18 =
    ageNum !== null && !isNaN(ageNum) && ageNum < MIN_AGE;
  const canSubmit = isLoginOnly
    ? email.trim() !== '' && password.trim() !== '' && !loading
    : email.trim() !== '' &&
        password.trim() !== '' &&
        gender !== null &&
        ageValid &&
        !loading;

  async function upsertUser(authId: string, displayName: string, userGender: Gender, userAge: number) {
    const { error: upsertError } = await supabase
      .from('users')
      .upsert(
        {
          auth_id: authId,
          display_name: displayName,
          gender: userGender,
          age: userAge,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'auth_id' }
      );
    if (upsertError) throw upsertError;
  }

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const trimmedEmail = email.trim().toLowerCase();
    const displayName = trimmedEmail.split('@')[0] || 'User';
    const userAge = ageNum ?? MIN_AGE;

    setLoading(true);
    setError(null);

    try {
      if (isLoginOnly) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        router.replace('/(tabs)');
        return;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid') || signInError.message.includes('credentials')) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: trimmedEmail,
            password,
          });
          if (signUpError) {
            setError(signUpError.message);
            return;
          }
          if (signUpData.user) {
            if (signUpData.session) {
              try {
                await upsertUser(signUpData.user.id, displayName, gender!, userAge);
              } catch (upsertErr) {
                const msg = upsertErr && typeof upsertErr === 'object' && 'message' in upsertErr
                  ? String((upsertErr as { message: unknown }).message)
                  : 'Could not save profile.';
                setError(msg);
                return;
              }
            } else {
              setError('Check your email to confirm your account, then try logging in.');
              return;
            }
          }
        } else {
          setError(signInError.message);
          return;
        }
      } else if (signInData?.user) {
        try {
          await upsertUser(signInData.user.id, displayName, gender!, userAge);
        } catch (upsertErr) {
          const msg = upsertErr && typeof upsertErr === 'object' && 'message' in upsertErr
            ? String((upsertErr as { message: unknown }).message)
            : 'Could not save profile.';
          setError(msg);
          return;
        }
      }

      router.replace('/upload');
    } catch (e) {
      const message =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : e instanceof Error
            ? e.message
            : 'Something went wrong.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#999"
            secureTextEntry
          />
          {!isLoginOnly && (
            <>
              <Text style={styles.label}>Gender (required)</Text>
              <Text style={styles.hint}>So we can match you to the right celebrity.</Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.genderOption,
                      gender === opt.value && styles.genderOptionSelected,
                    ]}
                    onPress={() => setGender(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.genderOptionText,
                        gender === opt.value && styles.genderOptionTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Age (required)</Text>
              <Text style={styles.hint}>You must be at least 18.</Text>
              <TextInput
                style={[styles.input, ageUnder18 && styles.inputError]}
                value={age}
                onChangeText={setAge}
                placeholder="e.g. 25"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={3}
              />
              {ageUnder18 && (
                <Text style={styles.ageError}>You must be at least 18 to sign up.</Text>
              )}
            </>
          )}
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={!canSubmit}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  !canSubmit && styles.buttonTextDisabled,
                ]}
              >
                {isLoginOnly ? 'Log in' : 'Sign Up / Log In'}
              </Text>
            )}
          </TouchableOpacity>
          {!isLoginOnly && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => router.replace('/upload')}
              activeOpacity={0.8}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#000',
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#C00',
  },
  ageError: {
    fontSize: 14,
    color: '#C00',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#C00',
    marginBottom: 16,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  genderOptionSelected: {
    borderColor: '#000',
    backgroundColor: '#000',
  },
  genderOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  genderOptionTextSelected: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#CCC',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#999',
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});
