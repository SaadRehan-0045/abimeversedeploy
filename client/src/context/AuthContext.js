import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Configure axios to send cookies with requests
  axios.defaults.withCredentials = true;
  axios.defaults.baseURL = 'https://abimeversedeploy-kacmk5md4-saads-projects-6ca3a457.vercel.app';

  // Add request interceptor to include auth token
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        if (authToken) {
          config.headers.Authorization = `Bearer ${authToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
    };
  }, [authToken]);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/api/check-auth');
      console.log('Auth check response:', response.data);
      
      if (response.data.authenticated) {
        const userData = {
          username: response.data.username,
          name: response.data.name,
          userId: response.data.userId || response.data.user?.userId,
          email: response.data.email,
          _id: response.data._id // Include MongoDB ObjectId
        };
        
        setUser(userData);
        setIsAuthenticated(true);
        
        // Store token if provided
        if (response.data.token) {
          setAuthToken(response.data.token);
          localStorage.setItem('authToken', response.data.token);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Check if we have a token in localStorage
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        setAuthToken(storedToken);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (user_name, password) => {
    try {
      setLoading(true); // Set loading to true during login
      const response = await axios.post('/login', {
        user_name,
        password
      });

      console.log('Login API response:', response.data);

      if (response.data.success) {
        // Use the user data directly from the login response - FIXED
        const userData = {
          username: response.data.user.user_name,
          name: response.data.user.name,
          userId: response.data.user.userId || response.data.user._id,
          email: response.data.user.email,
          _id: response.data.user._id // Use the _id from login response
        };
        
        console.log('Setting user data:', userData);
        setUser(userData);
        setIsAuthenticated(true);
        
        // Store token if provided
        if (response.data.token) {
          setAuthToken(response.data.token);
          localStorage.setItem('authToken', response.data.token);
        }
        
        return { success: true, message: response.data.message };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response?.data) {
        return { success: false, message: error.response.data.message };
      }
      return { success: false, message: 'Login failed. Please try again.' };
    } finally {
      setLoading(false); // Ensure loading is set to false
    }
  };

  const googleSignup = async (googleData) => {
    try {
      setLoading(true); // Set loading to true during Google signup
      const response = await axios.post('/google-signup', googleData);
      
      console.log('Google signup API response:', response.data);

      if (response.data.success) {
        // Use the user data directly from the Google signup response - FIXED
        const userData = {
          username: response.data.user.user_name,
          name: response.data.user.name,
          userId: response.data.user.userId || response.data.user._id,
          email: response.data.user.email,
          _id: response.data.user._id // Use the _id from Google signup response
        };
        
        console.log('Setting Google user data:', userData);
        setUser(userData);
        setIsAuthenticated(true);
        
        // Store token if provided
        if (response.data.token) {
          setAuthToken(response.data.token);
          localStorage.setItem('authToken', response.data.token);
        }
        
        return { success: true, message: response.data.message };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('Google signup error:', error);
      if (error.response?.data) {
        return { success: false, message: error.response.data.message };
      }
      return { success: false, message: 'Google signup failed. Please try again.' };
    } finally {
      setLoading(false); // Ensure loading is set to false
    }
  };

  const signup = async (userData) => {
    try {
      setLoading(true);
      const response = await axios.post('/adduser', userData);
      
      if (response.data.success) {
        // After successful signup, automatically log the user in
        const loginResponse = await login(userData.user_name, userData.password);
        
        if (loginResponse.success) {
          return { success: true, message: response.data.message };
        } else {
          return { 
            success: false, 
            message: 'Account created but login failed. Please try logging in.' 
          };
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      if (error.response?.data) {
        return { success: false, message: error.response.data.message };
      }
      return { success: false, message: 'Signup failed. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setAuthToken(null);
      setIsAuthenticated(false);
      localStorage.removeItem('authToken');
    }
  };

  const value = {
    user,
    authToken,
    isAuthenticated,
    loading,
    login,
    logout,
    signup,
    googleSignup,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );

};

