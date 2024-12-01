import { StyleSheet, SafeAreaView, Text, View } from 'react-native';

export default function Logs() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Logs</Text>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    

  },
  text: {
    color: '#ffffff', 
    fontSize: 18,
  },
});