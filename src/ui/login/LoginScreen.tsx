import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { loginWithEmail, loginWithGoogle, getUserData } from '../../supabase/authService';
import { useColors } from '../../contexts/ColorContext';

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // const { setCurrentUser } = useAuth();
  
  const { colors, isDarkMode } = useColors();
  
  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await loginWithEmail(email, password);
      // Supabase user ID is in user.id, not user.uid
      const userData = await getUserData(userCredential.id);
      if (userData) {
        // setCurrentUser(userData);
      }
      // Navigation will be handled by the auth state listener
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Use the loginWithGoogle function from authService which handles Supabase auth
      await loginWithGoogle();
      // Navigation will be handled by the auth state listener
    } catch (error: any) {
      Alert.alert('Google Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollView}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentContainer}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/Smirk_Cat_Emoji.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={[styles.appName, { color: colors.textPrimary }]}>
                Of The Day
              </Text>
              <Text style={[styles.appName, { color: colors.secondary, fontSize: 16 }]}>
                Don't kill yourself you're too pretty.
              </Text>
            </View>
            
            <View style={styles.formContainer}>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              
              <TextInput
                style={[styles.input, {
                  backgroundColor: colors.inputBackground,
                  color: colors.inputText,
                  borderColor: colors.inputBorder
                }]}
                placeholder="Email"
                placeholderTextColor={colors.inputPlaceholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              <TextInput
                style={[styles.input, {
                  backgroundColor: colors.inputBackground,
                  color: colors.inputText,
                  borderColor: colors.inputBorder
                }]}
                placeholder="Password"
                placeholderTextColor={colors.inputPlaceholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              
              <TouchableOpacity 
                style={[styles.loginButton, { opacity: loading ? 0.7 : 1, backgroundColor: colors.primary }]}
                onPress={handleEmailLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.loginButton, styles.googleButton, { backgroundColor: colors.secondary }]}
                onPress={handleGoogleLogin}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>Login with Google</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.forgotPasswordButton}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={[styles.forgotPasswordText, {
                  color: colors.textSecondary
                }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.footer}>
              <Text style={[styles.noAccountText, { color: colors.textSecondary }]}>
                Don't have an account?
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={[styles.signUpText, { color: colors.primary }]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 30,
  },
  errorText: {
    color: '#FF6B6B',
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  loginButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  forgotPasswordButton: {
    alignSelf: 'center',
    marginTop: 16,
    padding: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noAccountText: {
    fontSize: 14,
    marginRight: 5,
  },
  signUpText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen; 