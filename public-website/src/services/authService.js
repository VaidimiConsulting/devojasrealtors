import { apiClient } from './api';

/**
 * Auth Service — connects to the DEVOJAS REALTORS backend.
 */
export const authService = {
  /**
   * Login via email, phone, or Associate ID (DEV-XXXX)
   */
  async login(identifier, password) {
    const cleanId = String(identifier || '').trim();
    const res = await apiClient('/auth/login', {
      method: 'POST',
      data: { email: cleanId, identifier: cleanId, login_id: cleanId, phone: cleanId, password }
    });
    if (res.success && res.data?.token) {
      localStorage.setItem('devojas_token', res.data.token);
      localStorage.setItem('devojas_user', JSON.stringify(res.data.user));
      return { success: true, user: res.data.user, token: res.data.token };
    }
    return { success: false, message: res.data?.message || res.error || 'Login failed. Please check your credentials.' };
  },

  /**
   * Register as Associate — user sets their own password.
   * Admin must approve before login is possible.
   */
  async signupAssociate({ name, email, phone, pan_number, aadhar_number, address, sponsor_code, password, confirm_password }) {
    const res = await apiClient('/auth/register-associate', {
      method: 'POST',
      data: {
        name: name ? String(name).trim() : '',
        email: email && String(email).trim() ? String(email).trim() : undefined,
        phone: phone ? String(phone).trim() : '',
        pan_number: pan_number ? String(pan_number).trim().toUpperCase() : '',
        aadhar_number: aadhar_number ? String(aadhar_number).trim() : '',
        address: address ? String(address).trim() : '',
        sponsor_code: sponsor_code ? String(sponsor_code).trim() : undefined,
        password,
        confirm_password
      }
    });
    if (res.success) {
      return { success: true, data: res.data?.data || res.data, user: res.data?.user };
    }
    return { success: false, message: res.data?.message || res.error || 'Registration failed. Please try again.' };
  },

  async signupAccounts({ name, email, phone, address, password, confirm_password }) {
    const res = await apiClient('/auth/register', {
      method: 'POST',
      data: { name, email: email || undefined, phone, address, password, confirm_password, role: 'accounts' }
    });
    if (res.success) {
      return { success: true, data: res.data?.data || res.data, user: res.data?.user };
    }
    return { success: false, message: res.data?.message || res.error || 'Registration failed. Please try again.' };
  },

  async signupClient({ name, email, phone, address, password, confirm_password }) {
    const res = await apiClient('/auth/register', {
      method: 'POST',
      data: { name, email: email || undefined, phone, address, password, confirm_password, role: 'client' }
    });
    if (res.success) {
      return { success: true, data: res.data?.data || res.data, user: res.data?.user };
    }
    return { success: false, message: res.data?.message || res.error || 'Registration failed. Please try again.' };
  },

  logout() {
    localStorage.removeItem('devojas_token');
    localStorage.removeItem('devojas_user');
  },

  getCurrentUser() {
    const raw = localStorage.getItem('devojas_user');
    return raw ? JSON.parse(raw) : null;
  },

  isLoggedIn() {
    return !!localStorage.getItem('devojas_token');
  }
};

