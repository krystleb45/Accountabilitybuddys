import axios, { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import authService from "./authService"; // Ensure correct usage of authService

// Define types for settings
export interface ProfileSettings {
  name: string;
  email: string;
  avatarUrl?: string;
  [key: string]: any; // Additional fields
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  [key: string]: any; // Additional fields
}

export interface PrivacySettings {
  showProfile: boolean;
  shareActivity: boolean;
  [key: string]: any; // Additional fields
}

// Create an axios instance for settings API
const apiClient = axios.create({
  baseURL: "https://accountabilitybuddys.com/api/settings",
  headers: new axios.AxiosHeaders({
    "Content-Type": "application/json",
  }),
});

// Axios interceptor to add the Authorization header to every request
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const authHeader = authService.getAuthHeader();
    if (!config.headers) {
      config.headers = new axios.AxiosHeaders();
    }
    for (const [key, value] of Object.entries(authHeader)) {
      config.headers.set(key, value);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Utility function to handle retries with exponential backoff
const axiosRetry = async <T>(fn: () => Promise<T>, retries = 3): Promise<T> => {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt < retries - 1 && error.response?.status >= 500) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
      } else {
        console.error("Request failed:", error); // Log the error for debugging
        throw new Error(
          error.response?.data?.message || "An error occurred. Please try again."
        );
      }
    }
  }
  throw new Error("Failed after multiple retries.");
};

// Update user profile settings
export const updateProfileSettings = async (
  profileData: Partial<ProfileSettings>
): Promise<ProfileSettings> => {
  try {
    const response: AxiosResponse<ProfileSettings> = await axiosRetry(() =>
      apiClient.put("/profile", profileData)
    );
    return response.data;
  } catch (error: any) {
    console.error("Error updating profile settings:", error);
    throw new Error(
      error.response?.data?.message || "Failed to update profile settings."
    );
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (
  notificationData: Partial<NotificationPreferences>
): Promise<NotificationPreferences> => {
  try {
    const response: AxiosResponse<NotificationPreferences> = await axiosRetry(() =>
      apiClient.put("/notifications", notificationData)
    );
    return response.data;
  } catch (error: any) {
    console.error("Error updating notification preferences:", error);
    throw new Error(
      error.response?.data?.message || "Failed to update notification preferences."
    );
  }
};

// Update privacy settings
export const updatePrivacySettings = async (
  privacyData: Partial<PrivacySettings>
): Promise<PrivacySettings> => {
  try {
    const response: AxiosResponse<PrivacySettings> = await axiosRetry(() =>
      apiClient.put("/privacy", privacyData)
    );
    return response.data;
  } catch (error: any) {
    console.error("Error updating privacy settings:", error);
    throw new Error(
      error.response?.data?.message || "Failed to update privacy settings."
    );
  }
};

// Fetch current settings
export const getSettings = async (): Promise<{
  profileSettings: ProfileSettings;
  notificationPreferences: NotificationPreferences;
  privacySettings: PrivacySettings;
}> => {
  try {
    const response: AxiosResponse<{
      profileSettings: ProfileSettings;
      notificationPreferences: NotificationPreferences;
      privacySettings: PrivacySettings;
    }> = await axiosRetry(() => apiClient.get("/"));
    return response.data;
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch settings."
    );
  }
};

// Export all functions as a single object
const SettingsService = {
  updateProfileSettings,
  updateNotificationPreferences,
  updatePrivacySettings,
  getSettings,
};

export default SettingsService;