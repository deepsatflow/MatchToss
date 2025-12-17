import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { useFonts } from 'expo-font';
import * as Haptics from 'expo-haptics';

type TossOutcome = 'head' | 'tail';
type Stage = 'idle' | 'flipping' | 'scratch' | 'celebrate';
type Point = { x: number; y: number };

const HEAD_IMAGE = require('../assets/images/head.png');
const TAIL_IMAGE = require('../assets/images/tail.png');
const LOTTIE_ANIMATION = require('../assets/lottie/play_animation.json');

const GRID_STEPS = 30;
const SCRATCH_STROKE = 34;

export default function App() {
  const [fontsLoaded] = useFonts({
    ProductSansBold: require('../assets/fonts/product_sans_bold.ttf'),
  });

  const flipAnim = useRef(new Animated.Value(0)).current;

  const [stage, setStage] = useState<Stage>('idle');
  const [tossOutcome, setTossOutcome] = useState<TossOutcome>('head');
  const [paths, setPaths] = useState<Point[][]>([]);
  const [scratchLayout, setScratchLayout] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [scratchProgress, setScratchProgress] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  const scratchCellsRef = useRef<Set<string>>(new Set());
  const scratchProgressRef = useRef(0);
  const revealTriggeredRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coinSoundRef = useRef<Audio.Sound | null>(null);
  const drumSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let isMounted = true;
    const prepareAudio = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const coin = new Audio.Sound();
        const drum = new Audio.Sound();
        await coin.loadAsync(require('../assets/sounds/coinflip.mp3'));
        await drum.loadAsync(require('../assets/sounds/drum_roll.m4a'));
        if (isMounted) {
          coinSoundRef.current = coin;
          drumSoundRef.current = drum;
        }
      } catch (error) {
        console.warn('Failed to load sounds', error);
      }
    };

    prepareAudio();

    return () => {
      isMounted = false;
      coinSoundRef.current?.unloadAsync().catch(() => {});
      drumSoundRef.current?.unloadAsync().catch(() => {});
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const resetExperience = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    drumSoundRef.current?.stopAsync().catch(() => {});
    revealTriggeredRef.current = false;
    scratchCellsRef.current.clear();
    scratchProgressRef.current = 0;
    setScratchProgress(0);
    setPaths([]);
    setStage('idle');
    setShowCelebration(false);
  }, []);

  const handleReveal = useCallback(async () => {
    if (revealTriggeredRef.current) {
      return;
    }
    revealTriggeredRef.current = true;
    setStage('celebrate');
    setShowCelebration(true);
    resetTimerRef.current && clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(resetExperience, 7000);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      await drumSoundRef.current?.replayAsync();
    } catch (error) {
      console.warn('Unable to play drum roll', error);
    }
  }, [resetExperience]);

  const handleScratchPoint = useCallback(
    (x: number, y: number) => {
      if (!scratchLayout.width || !scratchLayout.height) return;

      const cellWidth = scratchLayout.width / GRID_STEPS;
      const cellHeight = scratchLayout.height / GRID_STEPS;
      const radius = Math.ceil((SCRATCH_STROKE * 0.6) / Math.min(cellWidth, cellHeight));
      const col = Math.floor(x / cellWidth);
      const row = Math.floor(y / cellHeight);

      for (let r = row - radius; r <= row + radius; r++) {
        for (let c = col - radius; c <= col + radius; c++) {
          if (r < 0 || c < 0 || r >= GRID_STEPS || c >= GRID_STEPS) continue;
          scratchCellsRef.current.add(`${r}-${c}`);
        }
      }

      const nextProgress = scratchCellsRef.current.size / (GRID_STEPS * GRID_STEPS);
      if (Math.abs(nextProgress - scratchProgressRef.current) > 0.01) {
        scratchProgressRef.current = nextProgress;
        setScratchProgress(nextProgress);
      }
      if (nextProgress >= 0.5) {
        handleReveal();
      }
    },
    [handleReveal, scratchLayout],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => stage === 'scratch',
        onMoveShouldSetPanResponder: () => stage === 'scratch',
        onPanResponderGrant: (evt) => {
          if (stage !== 'scratch') return;
          const { locationX, locationY } = evt.nativeEvent;
          setPaths((prev) => [...prev, [{ x: locationX, y: locationY }]]);
          handleScratchPoint(locationX, locationY);
        },
        onPanResponderMove: (evt) => {
          if (stage !== 'scratch') return;
          const { locationX, locationY } = evt.nativeEvent;
          setPaths((prev) => {
            if (!prev.length) return [[{ x: locationX, y: locationY }]];
            const clone = [...prev];
            clone[clone.length - 1] = [...clone[clone.length - 1], { x: locationX, y: locationY }];
            return clone;
          });
          handleScratchPoint(locationX, locationY);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [handleScratchPoint, stage],
  );

  useEffect(() => {
    if (stage === 'scratch' && Platform.OS === 'android') {
      ToastAndroid.show('Scratch the card to see the toss!', ToastAndroid.SHORT);
    }
  }, [stage]);

  const startToss = useCallback(async () => {
    if (stage === 'flipping' || stage === 'celebrate' || stage === 'scratch') return;
    resetTimerRef.current && clearTimeout(resetTimerRef.current);
    revealTriggeredRef.current = false;
    scratchCellsRef.current.clear();
    scratchProgressRef.current = 0;
    setScratchProgress(0);
    setPaths([]);

    const outcome: TossOutcome = Math.random() > 0.5 ? 'head' : 'tail';
    setTossOutcome(outcome);
    setStage('flipping');
    flipAnim.setValue(0);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      await coinSoundRef.current?.replayAsync();
    } catch (error) {
      console.warn('Unable to play coin flip', error);
    }

    Animated.timing(flipAnim, {
      toValue: 1,
      duration: 1300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      flipAnim.setValue(0);
      setStage('scratch');
    });
  }, [flipAnim, stage]);

  const rotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '180deg', '360deg'],
  });
  const bounce = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.85, 1],
  });

  const toPathD = (points: Point[]) => {
    if (!points.length) return '';
    const [first, ...rest] = points;
    return [`M ${first.x} ${first.y}`, ...rest.map((p) => `L ${p.x} ${p.y}`)].join(' ');
  };

  const coinImage = tossOutcome === 'head' ? HEAD_IMAGE : TAIL_IMAGE;
  const revealPercent = Math.min(100, Math.round(scratchProgress * 100));

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LinearGradient colors={['#0b1624', '#0d2b45', '#0a3d62']} style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.title}>Match Toss</Text>
          <Text style={styles.subtitle}>Flip the coin, then scratch to reveal the winner.</Text>
        </View>

        <View style={styles.coinWrapper}>
          <Animated.View style={[styles.coinCard, { transform: [{ rotateY: rotate }, { scale: bounce }] }]}>
            <Image source={coinImage} style={styles.coin} resizeMode="contain" />
          </Animated.View>
          <Text style={styles.coinLabel}>
            {stage === 'scratch' || stage === 'celebrate'
              ? tossOutcome === 'head'
                ? 'Bharat wins the toss'
                : 'Paisa wins the toss'
              : 'Ready to call it?'}
          </Text>
        </View>

        <View
          style={styles.cardShell}
          onLayout={(event) => setScratchLayout(event.nativeEvent.layout)}
          pointerEvents="box-none">
          <LinearGradient colors={['#111827', '#0f2c3f']} style={styles.cardBackground}>
            <Text style={styles.cardTitle}>Scratch card</Text>
            <Text style={styles.cardOutcome}>{tossOutcome === 'head' ? 'Bharat' : 'Paisa'}</Text>
            <Image source={coinImage} style={styles.cardCoin} resizeMode="contain" />
            <Text style={styles.cardHint}>
              {stage === 'scratch'
                ? 'Scratch away the cover to reveal the toss.'
                : 'Tap Toss to lock in the result.'}
            </Text>
          </LinearGradient>

          {stage === 'scratch' && (
            <View style={styles.scratchCover} {...panResponder.panHandlers}>
              <Svg
                width={scratchLayout.width || '100%'}
                height={scratchLayout.height || '100%'}
                style={StyleSheet.absoluteFill}
                pointerEvents="none">
                <Defs>
                  <SvgLinearGradient id="overlayGradient" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#475569" stopOpacity="0.95" />
                    <Stop offset="1" stopColor="#1e293b" stopOpacity="0.98" />
                  </SvgLinearGradient>
                  <Mask id="revealMask">
                    <Rect width="100%" height="100%" fill="white" />
                    {paths.map((path, index) => (
                      <Path
                        key={`path-${index}`}
                        d={toPathD(path)}
                        stroke="black"
                        strokeWidth={SCRATCH_STROKE}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    ))}
                  </Mask>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#overlayGradient)" mask="url(#revealMask)" />
              </Svg>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {stage === 'scratch' ? (
            <View style={styles.progressRow}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${Math.max(8, revealPercent)}%` }]} />
              </View>
              <Text style={styles.progressText}>{revealPercent}% revealed</Text>
            </View>
          ) : stage === 'celebrate' ? (
            <Text style={styles.celebrateText}>Celebrating… resetting shortly</Text>
          ) : (
            <TouchableOpacity
              onPress={startToss}
              disabled={stage === 'flipping'}
              activeOpacity={0.85}
              style={[styles.primaryButton, stage === 'flipping' && styles.buttonDisabled]}>
              <Text style={styles.primaryButtonText}>{stage === 'flipping' ? 'Flipping…' : 'Toss the coin'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <Modal visible={showCelebration} transparent animationType="fade" onRequestClose={resetExperience}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <LottieView
              autoPlay
              loop
              source={LOTTIE_ANIMATION}
              style={styles.lottie}
              resizeMode="cover"
            />
            <Text style={styles.modalTitle}>Let&apos;s play!</Text>
            <Text style={styles.modalSubtitle}>Resetting for the next toss…</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={resetExperience}>
              <Text style={styles.secondaryButtonText}>Toss again now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontFamily: 'ProductSansBold',
    color: '#f8fafc',
    fontSize: 32,
  },
  subtitle: {
    color: '#cbd5e1',
    marginTop: 6,
    fontSize: 15,
    lineHeight: 20,
  },
  coinWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  coinCard: {
    width: 180,
    height: 180,
    borderRadius: 100,
    backgroundColor: '#10263a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  coin: {
    width: 140,
    height: 140,
  },
  coinLabel: {
    fontFamily: 'ProductSansBold',
    color: '#e2e8f0',
    fontSize: 18,
    marginTop: 12,
  },
  cardShell: {
    marginTop: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  cardBackground: {
    padding: 20,
    borderRadius: 20,
    minHeight: 260,
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#38bdf8',
    fontSize: 15,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardOutcome: {
    fontFamily: 'ProductSansBold',
    fontSize: 28,
    color: '#f8fafc',
    marginBottom: 12,
  },
  cardCoin: {
    width: '100%',
    height: 140,
    marginBottom: 12,
  },
  cardHint: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  scratchCover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  actions: {
    marginTop: 18,
  },
  primaryButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontFamily: 'ProductSansBold',
    fontSize: 18,
    color: '#0f172a',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: '#1f2937',
    borderRadius: 10,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 10,
  },
  progressText: {
    color: '#cbd5e1',
    fontFamily: 'ProductSansBold',
    fontSize: 14,
    width: 100,
    textAlign: 'right',
  },
  celebrateText: {
    color: '#cbd5e1',
    fontFamily: 'ProductSansBold',
    fontSize: 14,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#0b1624',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  lottie: {
    width: 240,
    height: 180,
  },
  modalTitle: {
    fontFamily: 'ProductSansBold',
    color: '#f8fafc',
    fontSize: 26,
    marginTop: 6,
  },
  modalSubtitle: {
    color: '#cbd5e1',
    marginTop: 6,
    fontSize: 14,
  },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  secondaryButtonText: {
    color: '#38bdf8',
    fontFamily: 'ProductSansBold',
    fontSize: 16,
  },
});
