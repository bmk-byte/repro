import { createClient } from '@supabase/supabase-js';

// Dev-only logging — never ships informational detail (URLs, query
// internals) to the production console.
const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL environment variable');
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY environment variable');
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// Create Supabase client with enhanced configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Enhanced retry mechanism
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on authentication errors or client errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500) {
          throw error;
        }
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      devLog(`Retry attempt ${attempt + 1} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Test connection function with retry and schema verification
export const testConnection = async () => {
  try {
    devLog('Testing Supabase connection...');
    devLog('Using URL:', supabaseUrl);
    devLog('Using key:', supabaseAnonKey ? '[REDACTED]' : 'undefined');
    
    // Check for invalid refresh token first
    try {
      const { error: sessionError } = await supabase.auth.getSession();
      if (sessionError && (
        sessionError.message?.includes('Invalid Refresh Token') ||
        sessionError.message?.includes('refresh_token_not_found') ||
        sessionError.code === 'refresh_token_not_found'
      )) {
        devLog('Invalid refresh token detected, signing out...');
        await supabase.auth.signOut();
        return { success: false, error: { type: 'auth', message: 'Session expired. Please sign in again.' } };
      }
    } catch (authError) {
      console.error('Auth check error:', authError);
      // Continue with connection test even if auth check fails
    }
    
    // Test basic connection
    const result = await retryWithBackoff(async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('id, name')
        .limit(1);
      
      if (error) {
        console.error('Connection test failed:', error);
        throw error;
      }
      
      return data;
    });
    
    devLog('Basic connection test successful:', result);
    
    // Test pending_judgments table specifically
    try {
      const { error: pendingJudgmentsError } = await supabase
        .from('pending_judgments')
        .select('id')
        .limit(1);
      
      if (pendingJudgmentsError) {
        console.error('pending_judgments table test failed:', pendingJudgmentsError);
        throw new Error(`pending_judgments table access failed: ${pendingJudgmentsError.message}`);
      }
      
      devLog('pending_judgments table test successful');
    } catch (error) {
      console.error('pending_judgments table verification failed:', error);
      throw error;
    }
    
    // Test pending_cases table specifically
    try {
      const { error: pendingCasesError } = await supabase
        .from('pending_cases')
        .select('id')
        .limit(1);
      
      if (pendingCasesError) {
        console.error('pending_cases table test failed:', pendingCasesError);
        throw new Error(`pending_cases table access failed: ${pendingCasesError.message}`);
      }
      
      devLog('pending_cases table test successful');
    } catch (error) {
      console.error('pending_cases table verification failed:', error);
      throw error;
    }
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Connection test failed after retries:', error);
    
    // Check if this is an auth error
    if (error && typeof error === 'object' && 'type' in error && error.type === 'auth') {
      return { success: false, error };
    }
    
    return { success: false, error };
  }
};

// Enhanced query wrapper with retry logic and better error handling
export const queryWithRetry = async (queryFn: () => Promise<any>) => {
  try {
    return await retryWithBackoff(queryFn);
  } catch (error) {
    console.error('Query failed after retries:', error);
    
    // If it's a table not found error, try to refresh the connection
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as any).message;
      if (message.includes('relation') && message.includes('does not exist')) {
        devLog('Table not found error detected, attempting connection refresh...');
        
        // Force a new connection by creating a fresh client instance
        const freshClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
          },
          db: {
            schema: 'public'
          },
          global: {
            headers: {
              'X-Client-Info': 'supabase-js-web-refresh',
            },
          },
        });
        
        // Test the fresh connection
        try {
          const { error: testError } = await freshClient
            .from('countries')
            .select('id')
            .limit(1);
          
          if (!testError) {
            devLog('Fresh connection successful, but original query still failed');
          }
        } catch (refreshError) {
          console.error('Fresh connection also failed:', refreshError);
        }
      }
    }
    
    throw error;
  }
};

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any): string => {
  if (!error) return 'An unknown error occurred';
  
  // Authentication/refresh token errors
  if (error.message?.includes('Invalid Refresh Token') || 
      error.message?.includes('refresh_token_not_found') ||
      error.message?.includes('Refresh Token Not Found') ||
      error.code === 'refresh_token_not_found') {
    return 'Your session has expired. Please sign in again.';
  }
  
  // Table/relation not found errors
  if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
    const tableName = error.message.match(/relation "([^"]+)" does not exist/)?.[1];
    return `Database table "${tableName}" not found. This may be a temporary connection issue. Please try again or contact support if the problem persists.`;
  }
  
  // Network connectivity issues
  if (error.message?.includes('Failed to fetch') || 
      error.message?.includes('NetworkError') ||
      error.message?.includes('network request failed') ||
      error.name === 'TypeError' && error.message === 'Failed to fetch') {
    return 'Unable to connect to the database. Please check your internet connection and try again.';
  }
  
  // CORS issues
  if (error.message?.includes('CORS') || error.message?.includes('Access-Control-Allow-Origin')) {
    return 'Connection blocked by browser security policy. Please check your network settings.';
  }
  
  // Authentication errors
  if (error.message?.includes('JWT') || 
      error.message?.includes('auth') || 
      error.message?.includes('token') ||
      error.status === 401) {
    return 'Authentication error. Please sign in again.';
  }
  
  // Permission errors
  if (error.status === 403) {
    return 'Permission denied. You may not have access to this resource.';
  }
  
  // Server errors
  if (error.status >= 500) {
    return `Server error (${error.status}). Please try again later.`;
  }
  
  // Generic error with status code
  if (error.status) {
    return `Request failed (${error.status}). Please try again.`;
  }
  
  // Fallback error message
  return error.message || 'An unexpected error occurred. Please try again.';
};

// Connection health check
export const checkConnectionHealth = async () => {
  try {
    const startTime = Date.now();
    const { error } = await supabase
      .from('countries')
      .select('count')
      .limit(1)
      .single();
    
    const responseTime = Date.now() - startTime;
    
    return {
      isHealthy: !error,
      responseTime,
      error: error ? handleSupabaseError(error) : null
    };
  } catch (error) {
    return {
      isHealthy: false,
      responseTime: null,
      error: handleSupabaseError(error)
    };
  }
};

// Function to verify table existence
export const verifyTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);
    
    return !error;
  } catch (error) {
    console.error(`Table ${tableName} verification failed:`, error);
    return false;
  }
};

// NOTE: no module-level testConnection() call here — the app's own
// connection check (App.tsx) already covers this; calling it a second time
// on every module load duplicated three warm-up queries for no benefit.