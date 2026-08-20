import { SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";
import { usePresenceStatus } from "./services/usePresenceStatus";

export default function App() {
  const { prediction, connected } = usePresenceStatus();
  const occupied = prediction?.status === "OCCUPIED" || prediction?.status === "MOTION_DETECTED";

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.card, occupied ? styles.occupied : styles.empty]}>
        <Text style={styles.eyebrow}>ROOM STATUS</Text>
        <Text style={styles.title}>{prediction?.status === "EMPTY" ? "ROOM EMPTY" : occupied ? "PERSON DETECTED" : "SIGNAL UNSTABLE"}</Text>
        <Text style={styles.metric}>Confidence: {Math.round((prediction?.confidence ?? 0) * 100)}%</Text>
        <Text style={styles.metric}>Motion: {prediction?.motion ? "Detected" : "Not detected"}</Text>
        <Text style={styles.metric}>Connection: {connected ? "Live" : "Offline"}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617", justifyContent: "center", padding: 24 },
  card: { borderRadius: 28, padding: 28, minHeight: 320, justifyContent: "center" },
  occupied: { backgroundColor: "#047857" },
  empty: { backgroundColor: "#334155" },
  eyebrow: { color: "rgba(255,255,255,0.7)", fontWeight: "700", letterSpacing: 4, marginBottom: 18 },
  title: { color: "white", fontSize: 40, fontWeight: "900", marginBottom: 24 },
  metric: { color: "white", fontSize: 18, marginTop: 8 },
});
