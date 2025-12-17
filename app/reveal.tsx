import { useFonts } from "expo-font";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Image,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Defs,
  Mask,
  Path,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";

type TossOutcome = "head" | "tail";
type Stage = "scratch" | "celebrate";
type Point = { x: number; y: number };

const HEAD_IMAGE = require("../assets/images/head.png");
const TAIL_IMAGE = require("../assets/images/tail.png");

const GRID_STEPS = 30;
const SCRATCH_STROKE = 34;

export default function RevealScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ outcome?: string }>();
  const tossOutcome: TossOutcome = params.outcome === "tail" ? "tail" : "head";

  const [fontsLoaded] = useFonts({
    ProductSansBold: require("../assets/fonts/product_sans_bold.ttf"),
  });

  const [stage, setStage] = useState<Stage>("scratch");
  const [paths, setPaths] = useState<Point[][]>([]);
  const [scratchLayout, setScratchLayout] = useState<{
    width: number;
    height: number;
  }>({
    width: 0,
    height: 0,
  });
  const [scratchProgress, setScratchProgress] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const scratchCellsRef = useRef<Set<string>>(new Set());
  const scratchProgressRef = useRef(0);
  const revealTriggeredRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const drumPlayer = useAudioPlayer(require("../assets/sounds/drum_roll.m4a"));

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
      interruptionModeAndroid: "duckOthers",
    }).catch(() => {});

    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []);

  const resetExperience = useCallback(
    (goHome = true) => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      drumPlayer.pause();
      drumPlayer.seekTo(0).catch(() => {});
      revealTriggeredRef.current = false;
      scratchCellsRef.current.clear();
      scratchProgressRef.current = 0;
      setScratchProgress(0);
      setPaths([]);
      setStage("scratch");
      setRemainingSeconds(0);

      if (goHome) {
        router.replace("/");
      }
    },
    [drumPlayer, router]
  );

  const handleReveal = useCallback(async () => {
    if (revealTriggeredRef.current) {
      return;
    }
    revealTriggeredRef.current = true;
    setStage("celebrate");
    resetTimerRef.current && clearTimeout(resetTimerRef.current);
    setRemainingSeconds(10);
    resetTimerRef.current = setTimeout(() => resetExperience(true), 10000);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    countdownIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    try {
      drumPlayer.seekTo(0).catch(() => {});
      drumPlayer.play();
    } catch (error) {
      console.warn("Unable to play drum roll", error);
    }
  }, [drumPlayer, resetExperience]);

  const handleScratchPoint = useCallback(
    (x: number, y: number) => {
      if (!scratchLayout.width || !scratchLayout.height) return;

      const cellWidth = scratchLayout.width / GRID_STEPS;
      const cellHeight = scratchLayout.height / GRID_STEPS;
      const radius = Math.ceil(
        (SCRATCH_STROKE * 0.6) / Math.min(cellWidth, cellHeight)
      );
      const col = Math.floor(x / cellWidth);
      const row = Math.floor(y / cellHeight);

      for (let r = row - radius; r <= row + radius; r++) {
        for (let c = col - radius; c <= col + radius; c++) {
          if (r < 0 || c < 0 || r >= GRID_STEPS || c >= GRID_STEPS) continue;
          scratchCellsRef.current.add(`${r}-${c}`);
        }
      }

      const nextProgress =
        scratchCellsRef.current.size / (GRID_STEPS * GRID_STEPS);
      if (Math.abs(nextProgress - scratchProgressRef.current) > 0.01) {
        scratchProgressRef.current = nextProgress;
        setScratchProgress(nextProgress);
      }
      if (nextProgress >= 0.5) {
        handleReveal();
      }
    },
    [handleReveal, scratchLayout]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => stage === "scratch",
        onMoveShouldSetPanResponder: () => stage === "scratch",
        onPanResponderGrant: (evt) => {
          if (stage !== "scratch") return;
          const { locationX, locationY } = evt.nativeEvent;
          setPaths((prev) => [...prev, [{ x: locationX, y: locationY }]]);
          handleScratchPoint(locationX, locationY);
        },
        onPanResponderMove: (evt) => {
          if (stage !== "scratch") return;
          const { locationX, locationY } = evt.nativeEvent;
          setPaths((prev) => {
            if (!prev.length) return [[{ x: locationX, y: locationY }]];
            const clone = [...prev];
            clone[clone.length - 1] = [
              ...clone[clone.length - 1],
              { x: locationX, y: locationY },
            ];
            return clone;
          });
          handleScratchPoint(locationX, locationY);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [handleScratchPoint, stage]
  );

  useEffect(() => {
    if (stage === "scratch" && Platform.OS === "android") {
      ToastAndroid.show(
        "Scratch the card to see the toss!",
        ToastAndroid.SHORT
      );
    }
  }, [stage]);

  const toPathD = (points: Point[]) => {
    if (!points.length) return "";
    const [first, ...rest] = points;
    return [
      `M ${first.x} ${first.y}`,
      ...rest.map((p) => `L ${p.x} ${p.y}`),
    ].join(" ");
  };

  const coinImage = tossOutcome === "head" ? HEAD_IMAGE : TAIL_IMAGE;
  const revealPercent = Math.min(100, Math.round(scratchProgress * 100));

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LinearGradient colors={["#ffffff", "#f7f7f2"]} style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <Text style={styles.title}>Scratch to reveal</Text>
          <Text style={styles.subtitle}>
            Uncover the card to see who won the toss.
          </Text>
        </View>

        <View
          style={styles.cardShell}
          onLayout={(event) => setScratchLayout(event.nativeEvent.layout)}
          pointerEvents="box-none"
        >
          <LinearGradient
            colors={["#ffffff", "#f4f4ed"]}
            style={styles.cardBackground}
          >
            <Text style={styles.cardTitle}>Toss winner</Text>
            <Text style={styles.cardOutcome}>
              {tossOutcome === "head" ? "Head" : "Tail"}
            </Text>
            <Image
              source={coinImage}
              style={styles.cardCoin}
              resizeMode="contain"
            />
            <Text style={styles.cardHint}>
              {stage === "scratch"
                ? "Scratch away the cover to reveal the result."
                : "Revealed! Returning to toss soon."}
            </Text>
          </LinearGradient>

          {stage === "scratch" && (
            <View style={styles.scratchCover} {...panResponder.panHandlers}>
              <Svg
                width={scratchLayout.width || "100%"}
                height={scratchLayout.height || "100%"}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              >
                <Defs>
                  <SvgLinearGradient
                    id="overlayGradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                  >
                    <Stop offset="0" stopColor="#d6d3d1" stopOpacity="1" />
                    <Stop offset="1" stopColor="#b8b6b4" stopOpacity="1" />
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
                <Rect
                  width="100%"
                  height="100%"
                  fill="url(#overlayGradient)"
                  mask="url(#revealMask)"
                />
              </Svg>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {stage === "scratch" ? (
            <View style={styles.progressRow}>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.max(8, revealPercent)}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{revealPercent}% revealed</Text>
            </View>
          ) : (
            <Text style={styles.celebrateText}>
              Celebrating... heading back in {remainingSeconds} seconds
            </Text>
          )}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => resetExperience(true)}
          >
            <Text style={styles.secondaryButtonText}>Back to toss</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
    fontFamily: "ProductSansBold",
    color: "#0f172a",
    fontSize: 32,
  },
  subtitle: {
    color: "#475569",
    marginTop: 6,
    fontSize: 15,
    lineHeight: 20,
  },
  cardShell: {
    marginTop: 12,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#f6f6f0",
  },
  cardBackground: {
    padding: 20,
    borderRadius: 20,
    minHeight: 260,
    justifyContent: "center",
  },
  cardTitle: {
    color: "#0f8f57",
    fontSize: 15,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardOutcome: {
    fontFamily: "ProductSansBold",
    fontSize: 28,
    color: "#0f172a",
    marginBottom: 12,
  },
  cardCoin: {
    width: "100%",
    height: 140,
    marginBottom: 12,
  },
  cardHint: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 20,
  },
  scratchCover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  actions: {
    marginTop: 18,
    gap: 12,
    paddingBottom: 40,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 24,
  },
  progressBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: "#e5e7eb",
    borderRadius: 10,
    marginRight: 12,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#0f8f57",
    borderRadius: 10,
  },
  progressText: {
    color: "#1f2937",
    fontFamily: "ProductSansBold",
    fontSize: 14,
    width: 110,
    textAlign: "right",
  },
  celebrateText: {
    color: "#475569",
    fontFamily: "ProductSansBold",
    fontSize: 14,
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "#0f8f57",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 18,
    minHeight: 128,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontFamily: "ProductSansBold",
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#f8f8f4",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  lottie: {
    width: 240,
    height: 180,
  },
  modalTitle: {
    fontFamily: "ProductSansBold",
    color: "#0f172a",
    fontSize: 26,
    marginTop: 6,
  },
  modalSubtitle: {
    color: "#475569",
    marginTop: 6,
    fontSize: 14,
  },
});
