import type {
  LoginFormData,
  RegisterFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
  AuthValidationResult,
} from "@/types/auth.types";

const MIN_PASSWORD_LENGTH = 8;

export function validateLoginForm(data: LoginFormData): AuthValidationResult {
  if (!data.email?.trim() || !data.password) {
    return { success: false, error: "Ingresa tu correo y contraseña." };
  }
  return { success: true };
}

export function validateRegisterForm(data: RegisterFormData): AuthValidationResult {
  const isJtp = data.email.trim().toLowerCase().endsWith("@jtp.com.mx");
  const missingBase = !data.name?.trim() || !data.email?.trim() || !data.password || !data.confirmPassword;
  const missingCarrier = !isJtp && (!data.legalName?.trim() || !data.phone?.trim());
  if (missingBase || missingCarrier) {
    return { success: false, error: "Completa todos los campos." };
  }
  if (data.password !== data.confirmPassword) {
    return { success: false, error: "Las contraseñas no coinciden." };
  }
  if (data.password.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }
  return { success: true };
}

export function validateForgotPasswordForm(
  data: ForgotPasswordFormData
): AuthValidationResult {
  if (!data.email?.trim()) {
    return { success: false, error: "Ingresa tu correo electrónico." };
  }
  return { success: true };
}

export function validateResetPasswordForm(
  data: ResetPasswordFormData
): AuthValidationResult {
  if (!data.newPassword || !data.confirmPassword) {
    return { success: false, error: "Completa todos los campos." };
  }
  if (data.newPassword.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (data.newPassword !== data.confirmPassword) {
    return { success: false, error: "Las contraseñas no coinciden." };
  }
  return { success: true };
}
