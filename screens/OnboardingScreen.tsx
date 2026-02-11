import React, { useState, useRef, useEffect } from "react";
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
import * as Location from "expo-location";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/mcp-supabase";
import {
  onboardingSteps,
  OnboardingStepChips,
  OnboardingStepRadiusSlider,
  getFirstIncompleteOnboardingStepIndex,
  type OnboardingProfileSnapshot,
} from "../data/onboardingSteps";

const MILES_TO_KM = 1.60934;

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
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [locationSaving, setLocationSaving] = useState(false);
  const radiusTrackRef = useRef<View>(null);
  const [radiusTrackWidth, setRadiusTrackWidth] = useState(280);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resume at first incomplete step (e.g. only radius missing after dropping default)
  useEffect(() => {
    if (!user?.id) {
      setResolvingStartStep(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("first_name, last_name, birthdate, gender, pronouns, sexual_orientation, relationship_status, has_kids, city, lat, lng, radius_km")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      const start = getFirstIncompleteOnboardingStepIndex((data as OnboardingProfileSnapshot) ?? null);
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
      } else if (field === "radius_km") {
        updates.radius_km = value;
      } else {
        updates[field] = value;
      }
      const { error: e } = await supabase.from("profiles").update(updates).eq("id", user.id);
      if (e) throw e;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
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
        const col = step.id === "name" ? "first_name" : step.id === "last_name" ? "last_name" : step.id;
        await saveField(col, v);
      }
      setTextValue("");
    } else if (step.type === "chips") {
      const s = step as OnboardingStepChips;
      if (!selectedChip) {
        setError(s.validation("") ?? "Please select an option");
        return;
      }
      setError(null);
      const col =
        step.id === "name"
          ? "first_name"
          : step.id === "last_name"
            ? "last_name"
            : step.id === "gender"
              ? "gender"
              : step.id === "pronouns"
                ? "pronouns"
                : step.id === "sexual_orientation"
                  ? "sexual_orientation"
                  : step.id === "relationship_status"
                    ? "relationship_status"
                    : step.id === "has_kids"
                      ? "has_kids"
                      : step.id;
      await saveField(col, selectedChip);
      setSelectedChip(null);
    } else if (step.type === "radius_slider") {
      setError(null);
      const km = Math.round(radiusMiles * MILES_TO_KM);
      await saveField("radius_km", km);
    }
    // location step is handled by the button; advancing happens after save

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
      await saveField("city", result.city, { lat: result.lat, lng: result.lng });
      setStepIndex((i) => i + 1);
    }
    setLocationSaving(false);
  };

  const handleBack = () => {
    if (isFirst) return;
    setStepIndex((i) => i - 1);
    setError(null);
    setTextValue("");
    setSelectedChip(null);
  };

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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: theme.colors.text }]}>{step?.title}</Text>
          {step?.subtitle && (
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {step.subtitle}
            </Text>
          )}

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
              autoCapitalize={step.id === "name" || step.id === "last_name" ? "words" : "none"}
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
            <TouchableOpacity
              onPress={handleLocationPress}
              disabled={locationSaving}
              style={[styles.locationBtn, { backgroundColor: theme.colors.primary }]}
            >
              {locationSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.locationBtnIcon}>📍</Text>
                  <Text style={styles.locationBtnText}>Use My Location</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {step?.type === "radius_slider" && (() => {
            const s = step as OnboardingStepRadiusSlider;
            const min = s.minMiles;
            const max = s.maxMiles;
            const stepVal = s.stepMiles;
            const snap = (v: number) => Math.round(v / stepVal) * stepVal;
            const clamped = Math.max(min, Math.min(max, radiusMiles));
            const displayVal = snap(clamped);
            const percentage = ((displayVal - min) / (max - min)) * 100;
            const thumbSize = 24;
            const trackHeight = 6;
            const updateFromTouch = (touchX: number, width: number) => {
              const raw = min + (touchX / width) * (max - min);
              setRadiusMiles(snap(Math.max(min, Math.min(max, raw))));
            };
            return (
              <View style={styles.radiusSliderWrap}>
                <View
                  ref={radiusTrackRef}
                  style={styles.radiusTrackContainer}
                  onLayout={(e) => {
                    const w = e.nativeEvent.layout.width - 24;
                    if (w > 0) setRadiusTrackWidth(w);
                  }}
                >
                  <View style={[styles.radiusTrackBg, { backgroundColor: theme.colors.surface, height: trackHeight }]} />
                  <View
                    style={[
                      styles.radiusTrackFill,
                      { backgroundColor: theme.colors.primary, width: `${percentage}%`, height: trackHeight },
                    ]}
                  />
                  <View
                    style={[
                      styles.radiusThumb,
                      {
                        left: `${percentage}%`,
                        marginLeft: -thumbSize / 2,
                        width: thumbSize,
                        height: thumbSize,
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                  />
                  <View
                    style={StyleSheet.absoluteFill}
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                    onResponderGrant={(e) => updateFromTouch(e.nativeEvent.locationX, radiusTrackWidth)}
                    onResponderMove={(e) => updateFromTouch(e.nativeEvent.locationX, radiusTrackWidth)}
                  />
                </View>
                <Text style={[styles.radiusLabel, { color: theme.colors.text }]}>
                  {displayVal} miles
                </Text>
              </View>
            );
          })()}

          {error ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          {!isFirst && (
            <TouchableOpacity
              onPress={handleBack}
              style={[styles.footerBtn, styles.backBtn, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.footerBtnText, { color: theme.colors.text }]}>Back</Text>
            </TouchableOpacity>
          )}
          {(step?.type === "text" ||
            step?.type === "date" ||
            step?.type === "chips" ||
            step?.type === "radius_slider") && (
            <TouchableOpacity
              onPress={handleNext}
              disabled={saving}
              style={[styles.footerBtn, styles.nextBtn, { backgroundColor: theme.colors.primary }]}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={[styles.footerBtnText, styles.nextBtnText]}>
                  {isLast ? "Done" : "Next"}
                </Text>
              )}
            </TouchableOpacity>
          )}
          {step?.type === "location" && (
            <View style={styles.footerBtn} />
          )}
        </View>
      </KeyboardAvoidingView>
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
  radiusSliderWrap: {
    marginTop: 24,
  },
  radiusTrackContainer: {
    height: 24,
    justifyContent: "center",
    position: "relative",
  },
  radiusTrackBg: {
    width: "100%",
    borderRadius: 3,
  },
  radiusTrackFill: {
    position: "absolute",
    left: 0,
    top: 9,
    borderRadius: 3,
  },
  radiusThumb: {
    position: "absolute",
    top: 0,
    borderRadius: 12,
  },
  radiusLabel: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
    textAlign: "center",
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
