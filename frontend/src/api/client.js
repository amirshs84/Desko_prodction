import axios from 'axios';
import { API_BASE_URL } from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token refresh (optional/basic for now)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Skip 401 handling for login endpoints to allow the page to handle invalid credentials
    if (originalRequest.url.includes('auth/login') || originalRequest.url.includes('auth/otp-login')) {
      return Promise.reject(error);
    }
    
    // If 401 (Unauthorized) and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
       // For now, just logout if token expires (simple implementation)
       // Can be enhanced with refresh token logic later
       if (import.meta.env.DEV) {
        return Promise.reject(error);
      }
       import('../utils/auth').then(({ performLogout }) => performLogout());
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  // New password-based auth
  checkPhone: (phoneNumber) => api.post('auth/check-phone/', { phone_number: phoneNumber }),
  register: (phoneNumber, password, passwordConfirm) => api.post('auth/register/', { 
    phone_number: phoneNumber, 
    password, 
    password_confirm: passwordConfirm 
  }),
  login: (phoneNumber, password) => api.post('auth/login/', { phone_number: phoneNumber, password }),
  
  // Legacy OTP
  requestOtp: (phoneNumber) => api.post('auth/request-otp/', { phone_number: phoneNumber }),
  otpLogin: (phoneNumber, otp) => api.post('auth/otp-login/', { phone_number: phoneNumber, otp }),
  
  getProfile: () => api.get('profile/'),
  updateProfile: (data) => api.put('profile/', data),
  updateStudyStatus: (isStudying) => api.post('profile/study-status/', { is_studying: isStudying }),
};

export const dataAPI = {
  getSubjects: () => api.get('subjects/'),
  createSubject: (data) => api.post('subjects/', data),
  updateSubject: (id, data) => api.put(`subjects/${id}/`, data),
  deleteSubject: (id) => api.delete(`subjects/${id}/`),
  getSessions: () => api.get('sessions/'),
  createSession: (data) => api.post('sessions/', data),
  getDashboardStats: () => api.get('dashboard/stats/'),
  // PDF reading progress metadata only
  getPdfProgress: (filename) => api.get('pdf-progress/', { params: { filename } }),
  updatePdfProgress: (data) => api.post('pdf-progress/', data),
};

export const calendarAPI = {
  getEvents: () => api.get('calendar-events/'),
  createEvents: (events) => api.post('calendar-events/', events),
  updateEvent: (clientId, patch) => api.patch(`calendar-events/${clientId}/`, patch),
  deleteEvent: (clientId) => api.delete(`calendar-events/${clientId}/`),
  updateGroup: (groupId, patch) => api.patch(`calendar-events/group/${groupId}/`, patch),
  deleteGroup: (groupId) => api.delete(`calendar-events/group/${groupId}/`),
};

// Ticket / Messaging API (student)
export const ticketAPI = {
  sendTicket: (data) => api.post('tickets/', data),
  getMyTickets: () => api.get('tickets/my/'),
};

// Manager Panel API
export const managerAPI = {
  getDashboardKPI: () => api.get('manager/dashboard/'),
  getAttendance: (params) => api.get('manager/attendance/', { params }),
  getStudentList: (params) => api.get('manager/students/', { params }),
  getStudentProfile: (userId) => api.get(`manager/students/${userId}/profile/`),
  /** دانلود با axios تا هدر Authorization مثل سایدر API ست شود */
  exportExcelBlob: (params) => api.get('manager/export/excel/', {
    params,
    responseType: 'blob',
  }),
  getTickets: (params) => api.get('manager/tickets/', { params }),
  replyToTicket: (ticketId, reply) => api.post(`manager/tickets/${ticketId}/reply/`, { reply }),
  // Classes
  getClasses: (params) => api.get('manager/classes/', { params }),
  createClass: (data) => api.post('manager/classes/', data),
  getClass: (classId) => api.get(`manager/classes/${classId}/`),
  updateClass: (classId, data) => api.patch(`manager/classes/${classId}/`, data),
  deleteClass: (classId) => api.delete(`manager/classes/${classId}/`),
  getClassStudents: (classId, params) => api.get(`manager/classes/${classId}/students/`, { params }),
  addClassStudents: (classId, studentIds) => api.post(`manager/classes/${classId}/students/`, { student_ids: studentIds }),
  removeClassStudent: (classId, userId) => api.delete(`manager/classes/${classId}/students/${userId}/`),
  // Settings
  getSchoolSettings: () => api.get('manager/school/'),
  updateSchoolSettings: (data) => api.patch('manager/school/', data),
  changePassword: (data) => api.post('manager/change-password/', data),
  // Online classes
  getOnlineClasses: (params) => api.get('online-classes/manager/', { params }),
  assignOnlineClass: (data) => api.post('online-classes/manager/', data),
  getOnlineClass: (id) => api.get(`online-classes/manager/${id}/`),
  updateOnlineClass: (id, data) => api.patch(`online-classes/manager/${id}/`, data),
  deleteOnlineClass: (id) => api.delete(`online-classes/manager/${id}/`),
};

// Online Class API (student)
export const onlineClassAPI = {
  getMyClasses: () => api.get('online-classes/my/'),
  joinClass: (id, refresh = false) => api.post(`online-classes/${id}/join/`, null, {
    params: refresh ? { refresh: 'true' } : undefined,
  }),
};

// Notification API (student & manager receive; superadmin sends)
export const notificationAPI = {
  getNotifications:  ()     => api.get('notifications/'),
  getUnreadCount:    ()     => api.get('notifications/unread/'),
  markAllRead:       ()     => api.post('notifications/mark-read/'),

  // SuperAdmin only
  sendNotification:  (data) => api.post('superadmin/notifications/', data),
  getSentList:       ()     => api.get('superadmin/notifications/'),
  deleteNotification:(id)   => api.delete(`superadmin/notifications/?id=${id}`),
};

// SuperAdmin Panel API
export const superadminAPI = {
  getSchools: () => api.get('superadmin/schools/'),
  createSchool: (data) => api.post('superadmin/schools/', data),
  updateSchool: (id, data) => api.put(`superadmin/schools/${id}/`, data),
  deleteSchool: (id) => api.delete(`superadmin/schools/${id}/`),
  assignManager: (schoolId, data) => api.post(`superadmin/schools/${schoolId}/assign-manager/`, data),
  getSchoolMembers: (schoolId) => api.get(`superadmin/schools/${schoolId}/members/`),
  createStudent: (schoolId, data) => api.post(`superadmin/schools/${schoolId}/students/`, data),
  getTickets: () => api.get('superadmin/tickets/'),
  replyToTicket: (ticketId, reply) => api.post(`superadmin/tickets/${ticketId}/reply/`, { reply }),
};

export default api;

