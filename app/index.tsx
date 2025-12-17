import { Audio } from "expo-av";
import { useFonts } from "expo-font";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TossOutcome = "head" | "tail";
type Stage = "idle" | "flipping";

const TOSS_IMAGE = require("../assets/images/toss.png");

export default function HomeScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    ProductSansBold: require("../assets/fonts/product_sans_bold.ttf"),
  });

  const flipAnim = useRef(new Animated.Value(0)).current;
  const coinSoundRef = useRef<Audio.Sound | null>(null);

  const [stage, setStage] = useState<Stage>("idle");

  useEffect(() => {
    let isMounted = true;
    const prepareAudio = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const coin = new Audio.Sound();
        await coin.loadAsync(require("../assets/sounds/coinflip.mp3"));
        if (isMounted) {
          coinSoundRef.current = coin;
        }
      } catch (error) {
        console.warn("Failed to load toss sound", error);
      }
    };

    prepareAudio();

    return () => {
      isMounted = false;
      coinSoundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const startToss = useCallback(async () => {
    if (stage === "flipping") return;
    const outcome: TossOutcome = Math.random() > 0.5 ? "head" : "tail";

    setStage("flipping");
    flipAnim.setValue(0);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      await coinSoundRef.current?.replayAsync();
    } catch (error) {
      console.warn("Unable to play coin flip", error);
    }

    Animated.timing(flipAnim, {
      toValue: 1,
      duration: 1300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setStage("idle");
      router.push({ pathname: "/reveal", params: { outcome } });
    });
  }, [flipAnim, router, stage]);

  if (!fontsLoaded) {
    return null;
  }

  const rotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["0deg", "180deg", "360deg"],
  });
  const bounce = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.85, 1],
  });

  return (
    <LinearGradient colors={["#ffffff", "#f7f7f2"]} style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <Text style={styles.title}>Match Toss</Text>
          <Text style={styles.subtitle}>
            Flip the coin here, then we&apos;ll take you to scratch and reveal.
          </Text>
        </View>

        <View style={styles.coinWrapper}>
          <Animated.View
            style={[
              styles.coinCard,
              { transform: [{ rotateY: rotate }, { scale: bounce }] },
            ]}
          >
            <Image
              source={TOSS_IMAGE}
              style={styles.coin}
              resizeMode="contain"
            />
          </Animated.View>
          <Text style={styles.coinLabel}>
            {stage === "flipping"
              ? "Flipping... hold tight"
              : "Result stays hidden until you scratch the next screen"}
          </Text>
        </View>

        <View style={styles.cardShell}>
          <LinearGradient
            colors={["#ffffff", "#f4f4ed"]}
            style={styles.cardBackground}
          >
            <Text style={styles.cardTitle}>How it works</Text>
            <Text style={styles.cardHint}>
              Tap the button to toss. We&apos;ll send you to a scratch card to
              reveal who won.
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={startToss}
            disabled={stage === "flipping"}
            activeOpacity={1}
            style={[
              styles.primaryButton,
              stage === "flipping" && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {stage === "flipping" ? "Flipping..." : "Toss the coin"}
            </Text>
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
  coinWrapper: {
    alignItems: "center",
    marginBottom: 16,
  },
  coinCard: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#f4f5f7",
    alignItems: "center",
    justifyContent: "center",
  },
  coin: {
    width: 180,
    height: 180,
  },
  coinLabel: {
    fontFamily: "ProductSansBold",
    color: "#1f2937",
    fontSize: 16,
    marginTop: 12,
    textAlign: "center",
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
    minHeight: 140,
    justifyContent: "center",
  },
  cardTitle: {
    color: "#0f8f57",
    fontSize: 15,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardHint: {
    color: "#334155",
    fontSize: 16,
    lineHeight: 22,
  },
  actions: {
    marginTop: 24,
  },
  primaryButton: {
    backgroundColor: "#d4af37",
    paddingVertical: 20,
    paddingHorizontal: 16,
    minHeight: 128,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontFamily: "ProductSansBold",
    fontSize: 24,
    color: "#0f172a",
    textAlign: "center",
  },
});
