import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { updateUsername } from '@/src/api/user';
import { loadSession, saveSession } from '@/src/utils/storage';

export default function EditUsernameScreen() {
  const [userId, setUserId] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentSession() {
      const session = await loadSession();

      if (!session) {
        router.replace('/onboarding');
        return;
      }

      if (isMounted) {
        setUserId(session.userId);
        setCurrentUsername(session.username);
        setUsername(session.username);
        setIsLoading(false);
      }
    }

    loadCurrentSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const trimmedUsername = username.trim();
  const isInvalid = trimmedUsername.length < 3 || trimmedUsername === currentUsername || isSaving;

  async function onSave() {
    if (trimmedUsername.length < 3) {
      Alert.alert('Invalid username', 'Username must be at least 3 characters.');
      return;
    }

    if (trimmedUsername === currentUsername) {
      router.back();
      return;
    }

    try {
      setIsSaving(true);
      await updateUsername(userId, trimmedUsername);
      await saveSession({ userId, username: trimmedUsername });
      router.back();
    } catch {
      Alert.alert('Update failed', 'Could not update the username. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#365314" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Username</Text>
      <Text style={styles.subtitle}>Current: {currentUsername}</Text>

      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        placeholder="New username"
      />

      <View style={styles.actions}>
        <Pressable style={[styles.secondaryButton]} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>

        <Pressable style={[styles.primaryButton, isInvalid && styles.buttonDisabled]} onPress={onSave} disabled={isInvalid}>
          <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fefce8',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fefce8',
  },
  title: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: '900',
    color: '#365314',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 16,
    fontSize: 14,
    color: '#65a30d',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  actions: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#15803d',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});