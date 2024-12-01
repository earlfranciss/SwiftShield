import { StyleSheet, SafeAreaView, Text, View } from 'react-native';

export default function Analytics() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Analytics</Text>
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