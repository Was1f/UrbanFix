import React, { useContext } from "react";
import { View, Text, Button, ActivityIndicator, StyleSheet } from "react-native";
import { AuthContext } from "../context/AuthContext";

export default function Home({ navigation }) {
  const { user, logout, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6b48ff" />
        <Text style={{ marginTop: 10 }}>Loading user...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>
        Welcome {user?.fname ? `${user.fname} ${user.lname || ""}` : "User"}!
      </Text>

      {user?._id ? (
        <Button
          title="Profile"
          onPress={() => navigation.navigate("Profile", { userId: user._id })}
        />
      ) : (
        <Text style={{ color: "red", marginVertical: 10 }}>
          User info not loaded
        </Text>
      )}

      <View style={{ height: 20 }} />

      <Button
        title="Logout"
        onPress={logout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 50,
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  welcomeText: {
    fontSize: 18,
    marginBottom: 20,
  },
});
