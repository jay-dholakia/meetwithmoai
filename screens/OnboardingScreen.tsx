import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
} from "react-native-reanimated";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/mcp-supabase";
import {
  onboardingSteps,
  OnboardingStepChips,
  OnboardingStepConfirm,
  getFirstIncompleteOnboardingStepIndex,
  type OnboardingProfileSnapshot,
} from "../data/onboardingSteps";

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const [resolvingStartStep, setResolvingStartStep] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [textValue, setTextValue] = useState("");
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationCityState, setLocationCityState] = useState("");
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transitionDirection = useRef<"forward" | "back">("forward");

  useEffect(() => {
    if (!user?.id) {
      setResolvingStartStep(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("first_name, birthdate, city, lat, lng, pronouns, relationship_status, intent_confirmed_at")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (fetchError) {
        setResolvingStartStep(false);
        setStepIndex(0);
        return;
      }
      if (!data) {
        const { error: insertError } = await supabase.from("profiles").insert({
          id: user.id,
          first_name: " ",
        });
        if (cancelled) return;
        if (insertError) {
          console.warn("Onboarding: could not create profile row", insertError);
        }
        setStepIndex(0);
        setResolvingStartStep(false);
        return;
      }
      const start = getFirstIncompleteOnboardingStepIndex(data as OnboardingProfileSnapshot);
      if (start >= onboardingSteps.length) {
        setResolvingStartStep(false);
        onComplete();
        return;
      }
      setStepIndex(start);
      setResolvingStartStep(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id, onComplete]);

  const step = onboardingSteps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === onboardingSteps.length - 1;

  const saveField = async (field: string, value: string | number | null, extra?: { lat?: number; lng?: number }) => {
    if (!user?.id) return;
    setSaving(true);
    setError(null);
    try {
      const updates: Record<string, unknown> = {};
      if (field === "city" && extra?.lat != null && extra?.lng != null) {
        updates.city = value;
        updates.lat = extra.lat;
        updates.lng = extra.lng;
      } else {
        updates[field] = value;
      }
      const { error: e } = await supabase.from("profiles").update(updates).eq("id", user.id);
      if (e) throw e;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "Failed to save";
      console.warn("Onboarding save error:", message, err);
      setError(message);
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  };

  const requestLocation = async (): Promise<{ city: string; lat: number; lng: number } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location",
          "Location access was denied. Please enable it in settings to continue.",
          [{ text: "OK" }]
        );
        return null;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      const city =
        address?.city && address?.region
          ? `${address.city}, ${address.region}`
          : address?.city || address?.region || "Unknown Location";
      return {
        city,
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
    } catch (e) {
      console.error("Location error:", e);
      Alert.alert("Location Error", "Unable to get your location. Please try again.");
      return null;
    }
  };

  const handleNext = async () => {
    if (!step) return;
    transitionDirection.current = "forward";

    if (step.type === "location") {
      const city = locationCityState.trim();
      if (!city) {
        setError("Confirm or enter your city and state before continuing.");
        return;
      }
      setError(null);
      setSaving(true);
      try {
        await saveField("city", city, locationCoords ? { lat: locationCoords.lat, lng: locationCoords.lng } : undefined);
        setLocationCityState("");
        setLocationCoords(null);
      } catch {
        // error already set in saveField
      } finally {
        setSaving(false);
      }
      if (isLast) {
        onComplete();
        return;
      }
      setStepIndex((i) => i + 1);
      return;
    }

    if (step.type === "text" || step.type === "date") {
      const v = textValue.trim();
      const err = "validation" in step ? step.validation(v) : null;
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      if (step.id === "birthdate" && v) {
        const [month, day, year] = v.split("/");
        const iso = `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
        await saveField("birthdate", iso);
      } else {
        const col = step.id === "name" ? "first_name" : step.id;
        await saveField(col, v);
      }
      setTextValue("");
    } else if (step.type === "chips") {
      const s = step as OnboardingStepChips;
      if (!s.optional && !selectedChip) {
        setError(s.validation("") ?? "Please select an option");
        return;
      }
      setError(null);
      const col = step.id === "name" ? "first_name" : step.id;
      if (selectedChip) await saveField(col, selectedChip);
      setSelectedChip(null);
    } else if (step.type === "confirm") {
      const c = step as OnboardingStepConfirm;
      if (c.checkboxLabel != null && !confirmChecked) {
        setError((c.validation && c.validation(false)) ?? "Please confirm to continue");
        return;
      }
      setError(null);
      await saveField("intent_confirmed_at", new Date().toISOString());
      setConfirmChecked(false);
    }
    if (isLast) {
      onComplete();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const handleLocationPress = async () => {
    setLocationSaving(true);
    setError(null);
    const result = await requestLocation();
    if (result) {
      setLocationCityState(result.city);
      setLocationCoords({ lat: result.lat, lng: result.lng });
    }
    setLocationSaving(false);
  };

  const handleBack = () => {
    if (isFirst) return;
    transitionDirection.current = "back";
    setStepIndex((i) => i - 1);
    setError(null);
    setTextValue("");
    setSelectedChip(null);
    setConfirmChecked(false);
    setLocationCityState("");
    setLocationCoords(null);
  };

  const SWIPE_THRESHOLD = 60;
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        runOnJS(handleNext)();
      } else if (e.translationX > SWIPE_THRESHOLD) {
        runOnJS(handleBack)();
      }
    });

  const progress = ((stepIndex + 1) / onboardingSteps.length) * 100;

  if (resolvingStartStep) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top", "left", "right"]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top", "left", "right"]}>
      <View style={styles.progressWrap}>
        <View style={[styles.progressBg, { backgroundColor: theme.colors.surface }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: theme.colors.primary, width: `${progress}%` },
            ]}
          />
        </View>
        <Text style={[styles.stepLabel, { color: theme.colors.textSecondary }]}>
          Step {stepIndex + 1} of {onboardingSteps.length}
        </Text>
      </View>

      <GestureDetector gesture={panGesture}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboard}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <Animated.View
            key={stepIndex}
            entering={
              transitionDirection.current === "forward"
                ? SlideInRight.duration(280).springify().damping(18)
                : SlideInLeft.duration(280).springify().damping(18)
            }
            exiting={
              transitionDirection.current === "forward"
                ? SlideOutLeft.duration(240).springify().damping(18)
                : SlideOutRight.duration(240).springify().damping(18)
            }
            style={styles.stepContentWrap}
          >
          <Text style={[styles.title, { color: theme.colors.text }]}>{step?.title}</Text>
          {step?.subtitle && (
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {step.subtitle}
            </Text>
          )}

          {step?.type === "confirm" ? (
            <>
              {(step as OnboardingStepConfirm).body ? (
                <View style={styles.confirmBodyWrap}>
                  {(step as OnboardingStepConfirm).body!.split(/\n\n+/).map((para, idx) => (
                    <Text key={idx} style={[styles.confirmBody, { color: theme.colors.text }]}>
                      {para.trim()}
                    </Text>
                  ))}
                </View>
              ) : null}
              {(step as OnboardingStepConfirm).bullets &&
              (step as OnboardingStepConfirm).bullets!.length > 0 ? (
                <View style={styles.confirmBullets}>
                  {(step as OnboardingStepConfirm).bullets!.map((bullet, idx) => (
                    <View key={idx} style={styles.confirmBulletRow}>
                      <Text style={[styles.confirmBulletDot, { color: theme.colors.primary }]}>•</Text>
                      <Text style={[styles.confirmBulletText, { color: theme.colors.text }]}>
                        {bullet}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {(step as OnboardingStepConfirm).checkboxLabel != null ? (
                <TouchableOpacity
                  style={styles.confirmRow}
                  onPress={() => setConfirmChecked((c) => !c)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: confirmChecked ? theme.colors.primary : "transparent",
                      },
                    ]}
                  >
                    {confirmChecked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
                    {(step as OnboardingStepConfirm).checkboxLabel}
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.confirmRow}
                    onPress={() => setConfirmChecked((c) => !c)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: theme.colors.border,
                          backgroundColor: confirmChecked ? theme.colors.primary : "transparent",
                        },
                      ]}
                    >
                      {confirmChecked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
                      I'm aligned with Fika's purpose.
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.continueButton,
                      {
                        backgroundColor: confirmChecked ? theme.colors.primary : theme.colors.border,
                        opacity: confirmChecked ? 1 : 0.7,
                      },
                    ]}
                    onPress={async () => {
                      if (!confirmChecked) return;
                      setError(null);
                      setSaving(true);
                      try {
                        await saveField("intent_confirmed_at", new Date().toISOString());
                        onComplete();
                      } catch {
                        // error set in saveField
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving || !confirmChecked}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.continueButtonText}>Continue</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : null}

          {step?.type === "text" && (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder={step.placeholder}
              placeholderTextColor={theme.colors.textSecondary}
              value={textValue}
              onChangeText={setTextValue}
              autoCapitalize={step.id === "name" ? "words" : "none"}
              autoCorrect={false}
            />
          )}

          {step?.type === "date" && (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder={step.placeholder}
              placeholderTextColor={theme.colors.textSecondary}
              value={textValue}
              onChangeText={setTextValue}
              keyboardType="numbers-and-punctuation"
            />
          )}

          {step?.type === "chips" && (
            <View style={styles.chipsWrap}>
              {(step as OnboardingStepChips).options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setSelectedChip(opt)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        selectedChip === opt ? theme.colors.primary : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectedChip === opt ? "#FFF" : theme.colors.text },
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {step?.type === "location" && (
            <>
              <TextInput
                style={[
                  styles.input,
                  styles.locationInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="City, State"
                placeholderTextColor={theme.colors.textSecondary}
                value={locationCityState}
                onChangeText={(t) => {
                  setLocationCityState(t);
                  setError(null);
                }}
                editable={!locationSaving}
              />
              <TouchableOpacity
                onPress={handleLocationPress}
                disabled={locationSaving}
                style={[styles.locationBtn, { backgroundColor: theme.colors.primary }]}
              >
                {locationSaving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="locate" size={20} color="#FFF" />
                    <Text style={styles.locationBtnText}>Use My Location</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={[styles.locationHint, { color: theme.colors.textSecondary }]}>
                Location will appear above—confirm or edit, then swipe to continue.
              </Text>
            </>
          )}

          {error ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          ) : null}
          </Animated.View>
          </ScrollView>
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <View style={styles.swipeHintWrap}>
              <Ionicons name="chevron-back" size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.swipeHintText, { color: theme.colors.textSecondary }]}>
                Swipe to move between steps
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </GestureDetector>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  progressWrap: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  stepLabel: {
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  stepContentWrap: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 15,
  },
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  locationBtnIcon: {
    fontSize: 20,
  },
  locationBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  locationInput: {
    marginBottom: 12,
  },
  locationHint: {
    fontSize: 13,
    marginTop: 12,
    fontStyle: "italic",
  },
  swipeHintWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  swipeHintText: {
    fontSize: 14,
  },
  introBody: {
    fontSize: 16,
    marginTop: 12,
    fontStyle: "italic",
  },
  confirmBodyWrap: {
    marginTop: 8,
    marginBottom: 24,
  },
  confirmBody: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  confirmBullets: {
    marginBottom: 24,
  },
  confirmBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  confirmBulletDot: {
    fontSize: 18,
    lineHeight: 24,
  },
  confirmBulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  checkboxLabel: {
    fontSize: 16,
    flex: 1,
  },
  continueButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 14,
    marginTop: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  footerBtn: {
    minWidth: 100,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  nextBtn: {
    flex: 1,
    maxWidth: 200,
  },
  nextBtnText: {
    color: "#FFF",
    fontWeight: "600",
  },
  footerBtnText: {
    fontSize: 16,
  },
});
