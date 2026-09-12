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
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      const headers = config.headers;
      if (headers && typeof headers.set === 'function') {
        headers.set('Content-Type', false);
      } else if (headers) {
        delete headers['Content-Type'];
        delete headers['content-type'];
      }
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
  getEvents: (params) => api.get('calendar-events/', { params }),
  createEvents: (events, params) => api.post('calendar-events/', events, { params }),
  updateEvent: (clientId, patch, params) => api.patch(`calendar-events/${clientId}/`, patch, { params }),
  deleteEvent: (clientId, params) => api.delete(`calendar-events/${clientId}/`, { params }),
  updateGroup: (groupId, patch, params) => api.patch(`calendar-events/group/${groupId}/`, patch, { params }),
  deleteGroup: (groupId, params) => api.delete(`calendar-events/group/${groupId}/`, { params }),
};

/** پنل مشاور / برنامه‌ریزی — اپ Planning */
export const planningAPI = {
  getDashboard: () => api.get('planning/consultant/dashboard/'),
  getAnalytics: (params) => api.get('planning/consultant/analytics/', { params }),
  getPreferences: () => api.get('planning/consultant/preferences/'),
  updatePreferences: (data) => api.patch('planning/consultant/preferences/', data),
  getStudents: (params) => api.get('planning/consultant/students/', { params }),
  getGroups: () => api.get('planning/consultant/groups/'),
  createGroup: (data) => api.post('planning/consultant/groups/', data),
  getGroup: (groupId) => api.get(`planning/consultant/groups/${groupId}/`),
  updateGroup: (groupId, data) => api.patch(`planning/consultant/groups/${groupId}/`, data),
  deleteGroup: (groupId) => api.delete(`planning/consultant/groups/${groupId}/`),
  changeMembers: (groupId, data) => api.post(`planning/consultant/groups/${groupId}/members/`, data),

  getProgress: (params) => api.get('planning/progress/', { params }),
  getDailyReport: (params) => api.get('planning/progress/daily/', { params }),
  getActualCalendar: (params) => api.get('planning/progress/actual-calendar/', { params }),
  getBlockTemplates: () => api.get('planning/block-templates/'),
  createBlockTemplate: (data) => api.post('planning/block-templates/', data),
  updateBlockTemplate: (key, data) => api.patch(`planning/block-templates/${key}/`, data),
  deleteBlockTemplate: (key) => api.delete(`planning/block-templates/${key}/`),
  getAvailability: (params) => api.get('planning/calendar/availability/', { params }),
  placeBlock: (data, params) => api.post('planning/calendar/blocks/', data, { params }),
  moveBlock: (clientId, data, params) =>
    api.post(`planning/calendar/blocks/${clientId}/move/`, data, { params }),
  getSnapshots: (params) => api.get('planning/calendar/snapshots/', { params }),
  restoreSnapshot: (snapshotId, params) =>
    api.post(`planning/calendar/snapshots/${snapshotId}/restore/`, {}, { params }),

  previewPlan: (data) => api.post('planning/consultant/plans/preview/', data),
  publishPlan: (data) => api.post('planning/consultant/plans/publish/', data),
  applyStudentBlocks: (userId, data) =>
    api.post(`planning/consultant/students/${userId}/apply-blocks/`, data),
  getPlanRuns: () => api.get('planning/consultant/plans/'),
  getPlanRun: (runId) => api.get(`planning/consultant/plans/${runId}/`),

  getMyProposals: (params) => api.get('planning/me/proposals/', { params }),
  respondProposal: (proposalId, data) =>
    api.post(`planning/me/proposals/${proposalId}/respond/`, data),

  getStudentNotes: (userId) =>
    api.get(`planning/consultant/students/${userId}/notes/`),
  createStudentNote: (userId, data) =>
    api.post(`planning/consultant/students/${userId}/notes/`, data),
  updateStudentNote: (noteId, data) =>
    api.patch(`planning/consultant/notes/${noteId}/`, data),
  deleteStudentNote: (noteId) =>
    api.delete(`planning/consultant/notes/${noteId}/`),

  getStudentMessages: (userId) =>
    api.get(`planning/consultant/students/${userId}/messages/`),
  sendStudentMessage: (userId, data) =>
    api.post(`planning/consultant/students/${userId}/messages/`, data),
  getMyMessages: () => api.get('planning/me/messages/'),
  sendMessageToConsultant: (data) => api.post('planning/me/messages/', data),
  /** @deprecated از sendMessageToConsultant استفاده کنید */
  replyToConsultantMessage: (data) => api.post('planning/me/messages/', data),
  getMyConsultants: () => api.get('planning/me/consultants/'),
};

async function asPdfBlob(response) {
  const blob = response.data;
  const type = String(response.headers['content-type'] || blob?.type || '').toLowerCase();
  if (!(blob instanceof Blob) || type.includes('json')) {
    let message = 'دانلود دفترچه ناموفق بود';
    if (blob instanceof Blob) {
      try {
        const parsed = JSON.parse(await blob.text());
        message = parsed.error || parsed.code || message;
      } catch {
        /* ignore */
      }
    }
    throw Object.assign(new Error(message), { response: { data: { error: message } } });
  }
  const header = await blob.slice(0, 5).text();
  if (!header.startsWith('%PDF')) {
    const message = 'فایل دفترچه روی سرور PDF معتبر نیست';
    throw Object.assign(new Error(message), { response: { data: { error: message } } });
  }
  if (blob.type === 'application/pdf') return blob;
  return blob.slice(0, blob.size, 'application/pdf');
}

export const examAPI = {
  listExams: () => api.get('exams/'),
  createExam: (formData) => api.post('exams/', formData, { timeout: 180000 }),
  getExam: (examId) => api.get(`exams/${examId}/`),
  getExamBookletBlob: (examId) =>
    api.get(`exams/${examId}/booklet/`, {
      responseType: 'blob',
      timeout: 180000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }).then(asPdfBlob),
  createSession: (examId, data) => api.post(`exams/${examId}/sessions/`, data),
  getSession: (sessionId) => api.get(`exam-sessions/${sessionId}/`),
  updateSession: (sessionId, data) => api.patch(`exam-sessions/${sessionId}/`, data),
  getParticipants: (sessionId) => api.get(`exam-sessions/${sessionId}/participants/`),
  addParticipants: (sessionId, userIds) =>
    api.post(`exam-sessions/${sessionId}/participants/`, { user_ids: userIds }),
  removeParticipant: (sessionId, userId) =>
    api.delete(`exam-sessions/${sessionId}/participants/${userId}/`),
  getSessionResults: (sessionId) => api.get(`exam-sessions/${sessionId}/results/`),
  getStudentResult: (sessionId, userId) =>
    api.get(`exam-sessions/${sessionId}/results/${userId}/`),

  getMySessions: () => api.get('me/exam-sessions/'),
  getBookletBlob: (sessionId) =>
    api.get(`exam-sessions/${sessionId}/booklet/`, {
      responseType: 'blob',
      timeout: 180000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }).then(asPdfBlob),
  startAttempt: (sessionId) => api.post(`exam-sessions/${sessionId}/attempts/`),
  getAttempt: (attemptId) => api.get(`attempts/${attemptId}/`),
  getAttemptProblems: (attemptId) => api.get(`attempts/${attemptId}/problems/`),
  sendAnswer: (attemptId, data) => api.put(`attempts/${attemptId}/answers/`, data),
  submitAttempt: (attemptId) => api.post(`attempts/${attemptId}/submit/`),
  getAttemptResult: (attemptId) => api.get(`attempts/${attemptId}/result/`),

  managerListSessions: () => api.get('manager/exam-sessions/'),
  managerSessionResults: (sessionId) => api.get(`manager/exam-sessions/${sessionId}/results/`),
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
  getConsultants: (schoolId) => api.get(`superadmin/schools/${schoolId}/consultants/`),
  assignConsultant: (schoolId, data) =>
    api.post(`superadmin/schools/${schoolId}/consultants/`, data),
  revokeConsultant: (schoolId, data) =>
    api.delete(`superadmin/schools/${schoolId}/consultants/`, { data }),
  getSchoolMembers: (schoolId) => api.get(`superadmin/schools/${schoolId}/members/`),
  updateSchoolMember: (schoolId, userId, data) =>
    api.patch(`superadmin/schools/${schoolId}/members/${userId}/`, data),
  createStudent: (schoolId, data) => api.post(`superadmin/schools/${schoolId}/students/`, data),
  getTickets: () => api.get('superadmin/tickets/'),
  replyToTicket: (ticketId, reply) => api.post(`superadmin/tickets/${ticketId}/reply/`, { reply }),
};

export default api;

