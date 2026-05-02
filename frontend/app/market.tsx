import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { buyJoker, getGold, getJokers, JokerItem } from '@/src/api/market';
import { loadSession } from '@/src/utils/storage';

const JOKER_IMAGES: Record<string, any> = {
  fish: require('../assets/images/fish.png'),
  wheel: require('../assets/images/wheel.png'),
  lollipop: require('../assets/images/lollipop-breaker.png'),
  swap: require('../assets/images/free-swap.png'),
  shuffle: require('../assets/images/shuffle.png'),
  party: require('../assets/images/party-booster.png'),
};

export default function MarketScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [gold, setGold] = useState<number | null>(null);
  const [jokers, setJokers] = useState<JokerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const fetchMarketData = useCallback(async (uid: string) => {
    try {
      const [goldAmount, jokersList] = await Promise.all([
        getGold(uid),
        getJokers()
      ]);
      setGold(goldAmount);
      setJokers(jokersList);
    } catch {
      Alert.alert('Error', 'Failed to load market data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const session = await loadSession();
      if (!session) {
        router.replace('/onboarding');
        return;
      }
      setUserId(session.userId);
      fetchMarketData(session.userId);
    }
    init();
  }, [fetchMarketData]);

  async function handleBuy(joker: JokerItem) {
    if (!userId) return;
    if (gold === null || gold < joker.cost) {
      Alert.alert('Insufficient Gold', `You need ${joker.cost} gold to buy ${joker.name}.`);
      return;
    }

    setBuyingId(joker.id);
    try {
      const response = await buyJoker({ user_id: userId, joker_id: joker.id });
      if (response.message === 'Joker purchased') {
        setGold(response.remaining_gold);
        Alert.alert('Success!', `You bought ${joker.name}.`);
      } else {
        Alert.alert('Error', response.message);
      }
    } catch {
      Alert.alert('Error', 'Failed to purchase joker.');
    } finally {
      setBuyingId(null);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Market</Text>

      <View style={styles.goldCard}>
        <Text style={styles.goldLabel}>Your Gold</Text>
        <Text style={styles.goldValue}>{gold ?? '--'}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#365314" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.jokersContainer}>
          {jokers.map((joker) => {
            const canAfford = gold !== null && gold >= joker.cost;
            const isBuying = buyingId === joker.id;

            return (
              <View key={joker.id} style={styles.jokerCard}>
                <Image source={JOKER_IMAGES[joker.id]} style={styles.jokerImage} />
                <View style={styles.jokerInfo}>
                  <Text style={styles.jokerName}>{joker.name}</Text>
                  <Text style={styles.jokerDesc}>{joker.description}</Text>
                </View>
                
                <Pressable
                  style={[styles.buyButton, !canAfford && styles.buyButtonDisabled]}
                  onPress={() => handleBuy(joker)}
                  disabled={!canAfford || isBuying}
                >
                  {isBuying ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.buyButtonText}>{joker.cost} G</Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
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
    paddingBottom: 40,
    gap: 16,
  },
  title: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: '900',
    color: '#365314',
  },
  goldCard: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: '#facc15',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goldLabel: {
    fontSize: 16,
    color: '#713f12',
    fontWeight: '700',
  },
  goldValue: {
    fontSize: 28,
    color: '#451a03',
    fontWeight: '900',
  },
  jokersContainer: {
    gap: 12,
  },
  jokerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  jokerImage: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
    marginRight: 16,
  },
  jokerInfo: {
    flex: 1,
    marginRight: 12,
  },
  jokerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1f2937',
  },
  jokerDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  buyButton: {
    backgroundColor: '#15803d',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  buyButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  buyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  backButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
});
