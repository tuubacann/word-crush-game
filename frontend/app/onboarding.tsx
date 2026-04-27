import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { createUser } from '@/src/api/user';
import { saveSession } from '@/src/utils/storage';

export default function OnboardingScreen() {
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const disabled = username.trim().length < 3 || isSubmitting;

  async function onSubmit() {
    const trimmed = username.trim();

    if (trimmed.length < 3) {
      Alert.alert('Invalid username', 'Username must be at least 3 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await createUser(trimmed);

      await saveSession({
        userId: response.user_id,
        username: trimmed,
      });

      router.replace('/home');
    } catch {
      Alert.alert('Request failed', 'Could not create your user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Word Crush</Text>
      <Text style={styles.subtitle}>Enter a username to begin</Text>

      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        placeholder="Username"
      />

      <Pressable style={[styles.button, disabled && styles.buttonDisabled]} onPress={onSubmit} disabled={disabled}>
        <Text style={styles.buttonText}>{isSubmitting ? 'Creating...' : 'Continue'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff7ed',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#7c2d12',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 16,
    color: '#9a3412',
  },
  input: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fdba74',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    marginTop: 16,
    width: '100%',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#ea580c',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
