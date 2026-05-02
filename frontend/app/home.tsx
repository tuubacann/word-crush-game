import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type Href, router, useFocusEffect } from 'expo-router';

import { getGold } from '@/src/api/market';
import { clearSession, loadSession } from '@/src/utils/storage';

export default function HomeScreen() {
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [gold, setGold] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const bootstrap = useCallback(async () => {
    const session = await loadSession();

    if (!session) {
      router.replace('/onboarding');
      return;
    }

    setUsername(session.username);
    setUserId(session.userId);
  }, []);

  const fetchGold = useCallback(async (id: string) => {
    try {
      const amount = await getGold(id);
      setGold(amount);
    } catch {
      setGold(null);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function refresh() {
        await bootstrap();
      }

      refresh().then(() => {
        if (!isActive) {
          return;
        }

        if (userId) {
          fetchGold(userId);
        }
      });

      return () => {
        isActive = false;
      };
    }, [bootstrap, fetchGold, userId])
  );

  async function onRefresh() {
    if (!userId) {
      return;
    }

    setIsRefreshing(true);
    await fetchGold(userId);
    setIsRefreshing(false);
  }

  function goToComingSoon(feature: string) {
    Alert.alert('Next step', `${feature} screen is the next item we will build.`);
  }

  function editUsername() {
    router.push('/edit-username');
  }

  const newGamePath = '/new-game' as Href;

  async function onLogout() {
    await clearSession();
    router.replace('/onboarding');
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={editUsername}>
          <Text style={styles.username}>{username || 'Player'}</Text>
          <Text style={styles.editHint}>Tap to edit username</Text>
        </Pressable>

        <Pressable onPress={onLogout}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      <View style={styles.goldCard}>
        <Text style={styles.goldLabel}>Gold</Text>
        <Text style={styles.goldValue}>{gold ?? '--'}</Text>
      </View>

      <Pressable style={styles.mainButton} onPress={() => router.push(newGamePath)}>
        <Text style={styles.mainButtonText}>New Game</Text>
      </Pressable>

      <Pressable style={styles.mainButton} onPress={() => goToComingSoon('Score Table')}>
        <Text style={styles.mainButtonText}>Score Table</Text>
      </Pressable>

      <Pressable style={styles.mainButton} onPress={() => router.push('/market')}>
        <Text style={styles.mainButtonText}>Market</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fefce8',
  },
  content: {
    padding: 20,
    gap: 14,
  },
  headerRow: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    fontSize: 22,
    fontWeight: '800',
    color: '#365314',
  },
  editHint: {
    marginTop: 2,
    fontSize: 12,
    color: '#65a30d',
  },
  logout: {
    fontSize: 14,
    color: '#7f1d1d',
    fontWeight: '700',
  },
  goldCard: {
    marginTop: 8,
    borderRadius: 16,
    padding: 18,
    backgroundColor: '#facc15',
  },
  goldLabel: {
    fontSize: 14,
    color: '#713f12',
    fontWeight: '700',
  },
  goldValue: {
    marginTop: 4,
    fontSize: 32,
    color: '#451a03',
    fontWeight: '900',
  },
  mainButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#15803d',
  },
  mainButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
});
