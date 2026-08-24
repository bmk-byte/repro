import { toast } from 'react-hot-toast';
import { handleSupabaseError } from './supabase';

/**
 * Handles form submission errors with appropriate user feedback
 * @param error The error object from the catch block
 * @param setSubmissionError Optional state setter for displaying error in UI
 */
export const handleFormError = (error: any, setSubmissionError?: (error: string) => void) => {
  let errorMessage: string;
  
  // Check for specific error types
  if (error.code === 'PGRST301') {
    errorMessage = 'The request timed out. Please try again.';
  } else if (error.code === '23505') {
    errorMessage = 'This record already exists.';
  } else if (error.code === '23503') {
    errorMessage = 'Referenced record does not exist.';
  } else if (error.code === '23514') {
    errorMessage = 'The data does not meet the required constraints.';
  } else if (error.message?.includes('duplicate key')) {
    errorMessage = 'This record already exists.';
  } else if (error.message?.includes('violates foreign key constraint')) {
    errorMessage = 'Referenced record does not exist.';
  } else if (error.message?.includes('violates check constraint')) {
    errorMessage = 'The data does not meet the required constraints.';
  } else if (error.message?.includes('invalid input syntax')) {
    errorMessage = 'Invalid data format.';
  } else if (error.message?.includes('value too long')) {
    errorMessage = 'One of the text fields exceeds the maximum length.';
  } else if (error.message?.includes('not-found')) {
    errorMessage = 'The requested resource was not found.';
  } else if (error.message?.includes('permission denied')) {
    errorMessage = 'You do not have permission to perform this action.';
  } else {
    // Use the generic Supabase error handler for other cases
    errorMessage = handleSupabaseError(error);
  }
  
  // Display toast notification
  toast.error(errorMessage);
  
  // Update state if provided
  if (setSubmissionError) {
    setSubmissionError(errorMessage);
  }
  
  // Log the error for debugging
  console.error('Form submission error:', error);
  
  return errorMessage;
};

/**
 * Handles file upload errors with appropriate user feedback
 * @param error The error object from the catch block
 */
export const handleFileUploadError = (error: any) => {
  let errorMessage: string;
  
  if (error.message?.includes('storage/object-too-large')) {
    errorMessage = 'The file is too large. Maximum size is 10MB.';
  } else if (error.message?.includes('storage/invalid-format')) {
    errorMessage = 'Invalid file format. Only PDF files are allowed.';
  } else if (error.message?.includes('storage/quota-exceeded')) {
    errorMessage = 'Storage quota exceeded. Please contact support.';
  } else if (error.message?.includes('storage/unauthorized')) {
    errorMessage = 'You are not authorized to upload files.';
  } else {
    errorMessage = handleSupabaseError(error);
  }
  
  toast.error(errorMessage);
  console.error('File upload error:', error);
  
  return errorMessage;
};

/**
 * Validates a file before upload
 * @param file The file to validate
 * @param maxSize Maximum file size in bytes
 * @param allowedTypes Array of allowed MIME types
 * @returns Object with isValid flag and error message if invalid
 */
export const validateFile = (
  file: File, 
  maxSize = 10 * 1024 * 1024, 
  allowedTypes = ['application/pdf']
): { isValid: boolean; error?: string } => {
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }
  
  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: `File size exceeds the limit of ${Math.round(maxSize / (1024 * 1024))}MB` 
    };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
    };
  }
  
  return { isValid: true };
};

/**
 * Handles database query errors with appropriate user feedback
 * @param error The error object from the catch block
 */
export const handleQueryError = (error: any) => {
  let errorMessage: string;
  
  if (error.code === 'PGRST301') {
    errorMessage = 'The database query timed out. Please try again.';
  } else if (error.code === '42P01') {
    errorMessage = 'The requested data is not available.';
  } else if (error.code === '42501') {
    errorMessage = 'You do not have permission to access this data.';
  } else {
    errorMessage = handleSupabaseError(error);
  }
  
  toast.error(errorMessage);
  console.error('Query error:', error);
  
  return errorMessage;
};