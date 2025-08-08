import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEYS = {
  ADMIN_TOKEN: 'admin_token',
  ADMIN_USERNAME: 'admin_username',
  ADMIN_ROLE: 'admin_role',
  SESSION_TIMESTAMP: 'session_timestamp',
};

const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; 
// const SESSION_TIMEOUT = 5 * 1000; //5 seconds
class SessionManager {
  // Store admin session data
  static async storeAdminSession(token, username, role) {
    try {
      const sessionData = {
        token,
        username,
        role,
        timestamp: Date.now(),
      };
      
      // Store in AsyncStorage
      await AsyncStorage.multiSet([
        [SESSION_KEYS.ADMIN_TOKEN, token],
        [SESSION_KEYS.ADMIN_USERNAME, username],
        [SESSION_KEYS.ADMIN_ROLE, role],
        [SESSION_KEYS.SESSION_TIMESTAMP, Date.now().toString()],
      ]);
      
      console.log('✅ Admin session stored successfully (AsyncStorage)');
      return true;
    } catch (error) {
      console.error('❌ Error storing admin session:', error);
      return false;
    }
  }

  // Get admin token
  static async getAdminToken() {
    try {
      const token = await AsyncStorage.getItem(SESSION_KEYS.ADMIN_TOKEN);
      const timestamp = await AsyncStorage.getItem(SESSION_KEYS.SESSION_TIMESTAMP);
      
      if (!token || !timestamp) {
        return null;
      }

      // Check if session has expired
      const sessionAge = Date.now() - parseInt(timestamp);
      if (sessionAge > SESSION_TIMEOUT) {
        console.log('⚠️ Session expired, clearing...');
        await this.clearAdminSession();
        return null;
      }

      return token;
    } catch (error) {
      console.error('❌ Error getting admin token:', error);
      return null;
    }
  }

  // Get admin session data
  static async getAdminSession() {
    try {
      const [token, username, role, timestamp] = await AsyncStorage.multiGet([
        SESSION_KEYS.ADMIN_TOKEN,
        SESSION_KEYS.ADMIN_USERNAME,
        SESSION_KEYS.ADMIN_ROLE,
        SESSION_KEYS.SESSION_TIMESTAMP,
      ]);

      if (!token[1] || !timestamp[1]) {
        return null;
      }

      // Check if session has expired
      const sessionAge = Date.now() - parseInt(timestamp[1]);
      if (sessionAge > SESSION_TIMEOUT) {
        console.log('⚠️ Session expired, clearing...');
        await this.clearAdminSession();
        return null;
      }

      return {
        token: token[1],
        username: username[1],
        role: role[1],
        timestamp: parseInt(timestamp[1]),
      };
    } catch (error) {
      console.error('❌ Error getting admin session:', error);
      return null;
    }
  }

  // Check if admin is logged in
  static async isAdminLoggedIn() {
    const session = await this.getAdminSession();
    return session !== null;
  }

  // Clear admin session
  static async clearAdminSession() {
    try {
      // Clear from AsyncStorage
      await AsyncStorage.multiRemove([
        SESSION_KEYS.ADMIN_TOKEN,
        SESSION_KEYS.ADMIN_USERNAME,
        SESSION_KEYS.ADMIN_ROLE,
        SESSION_KEYS.SESSION_TIMESTAMP,
      ]);
      
      console.log('✅ Admin session cleared successfully (AsyncStorage)');
      return true;
    } catch (error) {
      console.error('❌ Error clearing admin session:', error);
      return false;
    }
  }

  // Refresh session timestamp
  static async refreshSession() {
    try {
      const session = await this.getAdminSession();
      if (session) {
        await AsyncStorage.setItem(SESSION_KEYS.SESSION_TIMESTAMP, Date.now().toString());
        console.log('✅ Session refreshed (AsyncStorage)');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error refreshing session:', error);
      return false;
    }
  }
}

export default SessionManager;
