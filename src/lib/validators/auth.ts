import type {
  LoginFormData,
  RegisterFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
  AuthValidationResult,
} from "@/types/auth.types";
import {
  validateRegistrationDisplayName,
  validateRegistrationEmail,
} from "@/lib/validators/registration-abuse";

const MIN_PASSWORD_LENGTH = 8;

export function validateLoginForm(data: LoginFormData): AuthValidationResult {
  if (!data.email?.trim() || !data.password) {
    return { success: false, error: "Ingresa tu correo y contraseña." };
  }
  return { success: true };
}

export function validateRegisterForm(data: RegisterFormData): AuthValidationResult {
  const missingBase = !data.name?.trim() || !data.email?.trim() || !data.password || !data.confirmPassword;
  const missingCarrierFields = !data.legalName?.trim() || !data.phone?.trim();
  if (missingBase || missingCarrierFields) {
    return { success: false, error: "Completa todos los campos." };
  }
  if (data.password !== data.confirmPassword) {
    return { success: false, error: "Las contraseñas no coinciden." };
  }
  if (data.password.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const legal = validateRegistrationDisplayName(data.legalName.trim(), "La razón social");
  if (!legal.ok) return { success: false, error: legal.message };

  const person = validateRegistrationDisplayName(data.name.trim(), "El nombre");
  if (!person.ok) return { success: false, error: person.message };

  const emailCheck = validateRegistrationEmail(data.email.trim());
  if (!emailCheck.ok) return { success: false, error: emailCheck.message };

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
