import { StyleSheet, SafeAreaView, Text, View } from "react-native";

export default function Home() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Home</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    color: "#ffffff",
    fontSize: 18,
  },
});
