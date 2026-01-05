// Input sanitization and validation utilities
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  // Remove potentially harmful characters and scripts but preserve spaces
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .slice(0, 2000); // Limit input length
};

// Sanitization for fields that need trimming (like final save operations)
export const sanitizeInputWithTrim = (input: string): string => {
  if (!input) return '';
  
  // Remove potentially harmful characters and scripts
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .slice(0, 2000); // Limit input length
};

// Lighter sanitization for content fields like descriptions and notes
export const sanitizeContent = (input: string): string => {
  if (!input) return '';
  
  // Only remove dangerous scripts and tags, preserve natural text formatting
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .slice(0, 5000); // Higher limit for content fields
};

export const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  
  // Basic URL sanitization
  const trimmed = url.trim();
  
  // Check for valid protocols
  const allowedProtocols = ['http://', 'https://'];
  const hasValidProtocol = allowedProtocols.some(protocol => 
    trimmed.toLowerCase().startsWith(protocol)
  );
  
  if (!hasValidProtocol && trimmed.length > 0) {
    return `https://${trimmed}`;
  }
  
  // Remove potentially harmful characters
  return trimmed
    .replace(/[<>'"]/g, '')
    .slice(0, 2000);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { isValid: false, message: 'Password must be less than 128 characters' };
  }
  
  // Check for at least one lowercase, uppercase, number, and special character
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
    return { 
      isValid: false, 
      message: 'Password must include uppercase, lowercase, number, and special character' 
    };
  }
  
  return { isValid: true };
};

export const validateTextInput = (
  text: string, 
  minLength = 0, 
  maxLength = 1000,
  fieldName = 'Input'
): { isValid: boolean; message?: string } => {
  if (!text && minLength > 0) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  if (text && text.length < minLength) {
    return { isValid: false, message: `${fieldName} must be at least ${minLength} characters` };
  }
  
  if (text && text.length > maxLength) {
    return { isValid: false, message: `${fieldName} must be less than ${maxLength} characters` };
  }
  
  return { isValid: true };
};

export const rateLimitCheck = (key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean => {
  const now = Date.now();
  const windowKey = `${key}_${Math.floor(now / windowMs)}`;
  
  try {
    const attempts = JSON.parse(localStorage.getItem(windowKey) || '[]') as number[];
    const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      return false; // Rate limit exceeded
    }
    
    // Add current attempt
    recentAttempts.push(now);
    localStorage.setItem(windowKey, JSON.stringify(recentAttempts));
    
    // Clean up old entries
    const keys = Object.keys(localStorage).filter(k => k.startsWith(`${key}_`));
    keys.forEach(k => {
      const timestamp = parseInt(k.split('_')[1]);
      if (now - timestamp > windowMs) {
        localStorage.removeItem(k);
      }
    });
    
    return true;
  } catch {
    return true; // Allow on error
  }
};