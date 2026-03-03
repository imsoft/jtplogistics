export interface LoginFormData {
  email: string;
  password: string;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface ResetPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

export interface RegisterFormData {
  legalName: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthValidationResult {
  success: boolean;
  error?: string;
}
