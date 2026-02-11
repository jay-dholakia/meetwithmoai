import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

interface QuestionnaireProgressProps {
  current: number;
  total: number;
  showLabel?: boolean;
}

export default function QuestionnaireProgress({
  current,
  total,
  showLabel = true,
}: QuestionnaireProgressProps) {
  const theme = useTheme();
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <View style={styles.container}>
      {showLabel && (
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          Question {current + 1} of {total}
        </Text>
      )}
      <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: theme.colors.primary,
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={[styles.percentage, { color: theme.colors.textSecondary }]}>
          {percentage}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "500",
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
  percentage: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "right",
  },
});
