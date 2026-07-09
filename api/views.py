from rest_framework import status, generics, views
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Sum, Max, Count, Q, F
from django.db.models.functions import Coalesce, TruncDate
from django.http import HttpResponse
from datetime import timedelta, datetime
from .models import UserProfile, Subject, StudySession, ConsultantTicket, School, PDFReadProgress, Notification, NotificationRead, CalendarEvent, SchoolClass, ClassEnrollment
from .serializers import (
    PhoneLoginSerializer,
    UserProfileSerializer,
    SubjectSerializer,
    StudySessionSerializer,
    ConsultantTicketSerializer,
    StudentTicketDetailSerializer,
    ManagerTicketSerializer,
    TicketReplySerializer,
    ManagerStudentListSerializer,
    ManagerDashboardKPISerializer,
    SchoolSerializer,
    AssignManagerSerializer,
    SuperAdminManualStudentSerializer,
    PDFReadProgressSerializer,
    NotificationSerializer,
    SendNotificationSerializer,
    CalendarEventSerializer,
    CalendarEventGroupPatchSerializer,
    SchoolClassSerializer,
    ClassStudentSerializer,
    ClassEnrollmentRequestSerializer,
)
from .permissions import IsManager, IsSuperAdmin


import re
from django.contrib.auth.hashers import make_password, check_password


@api_view(['POST'])
@permission_classes([AllowAny])
def check_phone(request):
    """Check if phone number exists in database"""
    phone_number = request.data.get('phone_number')
    if not phone_number:
        return Response({'error': 'شماره تلفن الزامی است'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(username=phone_number)
        has_pw = False
        if hasattr(user, 'profile'):
            has_pw = user.profile.is_password_set
        return Response({
            'exists': True,
            'has_password': has_pw
        })
    except User.DoesNotExist:
        return Response({
            'exists': False,
            'has_password': False
        })


def validate_password(password):
    """
    Validate password requirements:
    - At least 8 characters
    - Contains uppercase letter
    - Contains lowercase letter
    - Contains number
    - Contains special character
    """
    if len(password) < 8:
        return False, 'رمز عبور باید حداقل ۸ کاراکتر باشد'
    
    if not re.search(r'[A-Z]', password):
        return False, 'رمز عبور باید حداقل یک حرف بزرگ انگلیسی داشته باشد'
    
    if not re.search(r'[a-z]', password):
        return False, 'رمز عبور باید حداقل یک حرف کوچک انگلیسی داشته باشد'
    
    if not re.search(r'[0-9]', password):
        return False, 'رمز عبور باید حداقل یک عدد داشته باشد'
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, 'رمز عبور باید حداقل یک علامت (!@#$%^&*...) داشته باشد'
    
    return True, ''


@api_view(['POST'])
@permission_classes([AllowAny])
def register_with_password(request):
    """Register new user with password"""
    phone_number = request.data.get('phone_number')
    password = request.data.get('password')
    password_confirm = request.data.get('password_confirm')
    
    if not phone_number or not password or not password_confirm:
        return Response({'error': 'همه فیلدها الزامی هستند'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if passwords match
    if password != password_confirm:
        return Response({'error': 'رمزهای عبور مطابقت ندارند'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate password
    is_valid, error_message = validate_password(password)
    if not is_valid:
        return Response({'error': error_message}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user already exists
    user_exists = User.objects.filter(username=phone_number).exists()
    
    if user_exists:
        user = User.objects.get(username=phone_number)
        # If user exists and has a password set, return error
        if hasattr(user, 'profile') and user.profile.is_password_set:
            return Response({'error': 'این شماره قبلاً ثبت شده است'}, status=status.HTTP_400_BAD_REQUEST)
        
        # If user exists but has no password (e.g. pre-created manager), update password
        user.set_password(password)
        user.save()
        
        profile = user.profile
        profile.is_password_set = True
        
        # If manager, skip profile completion
        if profile.role == 'manager':
            profile.is_profile_complete = True
            
        profile.save()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'profile': UserProfileSerializer(profile).data,
            'is_new_user': not profile.is_profile_complete
        }, status=status.HTTP_200_OK)
    
    # Create new user with password
    user = User.objects.create(
        username=phone_number,
        password=make_password(password)
    )
    
    profile = UserProfile.objects.create(
        user=user,
        phone_number=phone_number,
        is_password_set=True
    )
    
    # Generate tokens
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'profile': UserProfileSerializer(profile).data,
        'is_new_user': True
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_with_password(request):
    """Login existing user with password"""
    phone_number = request.data.get('phone_number')
    password = request.data.get('password')
    
    if not phone_number or not password:
        return Response({'error': 'شماره تلفن و رمز عبور الزامی هستند'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(username=phone_number)
        profile = user.profile
        
        # Check password
        if not check_password(password, user.password):
            return Response({'error': 'رمز عبور اشتباه است'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'profile': UserProfileSerializer(profile).data,
            'is_new_user': not profile.is_profile_complete
        }, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        return Response({'error': 'کاربری با این شماره یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


# Legacy OTP endpoints (keeping for backward compatibility)
@api_view(['POST'])
@permission_classes([AllowAny])
def request_otp(request):
    """
    Request OTP for phone number.
    In production, this would send SMS.
    For dev, it just returns success.
    """
    phone_number = request.data.get('phone_number')
    if not phone_number:
        return Response({'error': 'Phone number is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({'message': 'OTP sent', 'dev_code': '12345'})


@api_view(['POST'])
@permission_classes([AllowAny])
def phone_login(request):
    serializer = PhoneLoginSerializer(data=request.data)
    if serializer.is_valid():
        phone_number = serializer.validated_data['phone_number']
        otp = serializer.validated_data['otp']
        
        if otp != '12345':
            return Response(
                {'error': 'Invalid OTP'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user, created = User.objects.get_or_create(username=phone_number)
        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={'phone_number': phone_number}
        )
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'profile': UserProfileSerializer(profile).data,
            'is_new_user': created or not profile.is_profile_complete
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """Get or update user profile"""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user.profile

    def perform_update(self, serializer):
        # Check if invitation_code is provided
        invitation_code = self.request.data.get('invitation_code')
        user_profile = self.get_object()
        
        if invitation_code:
            try:
                school = School.objects.get(invitation_code=invitation_code, is_active=True)
                serializer.save(is_profile_complete=True, school=school)
            except School.DoesNotExist:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'invitation_code': 'کد دعوت نامعتبر است'})
        elif user_profile.school:
             # User already has a school, just update other fields
             serializer.save(is_profile_complete=True)
        else:
            # No code and no school
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'invitation_code': 'کد دعوت الزامی است'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_study_status(request):
    """Update user's is_studying status when timer starts/stops"""
    is_studying = request.data.get('is_studying', False)
    profile = request.user.profile
    profile.is_studying = is_studying
    profile.save()
    return Response({'status': 'updated', 'is_studying': is_studying})


class PDFReadProgressView(views.APIView):
    """
    Lightweight sync endpoint for PDF progress metadata.
    No file upload/storage on server side.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PDFReadProgressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        progress, _ = PDFReadProgress.objects.update_or_create(
            user=request.user,
            filename=data['filename'],
            defaults={
                'last_read_page': data['last_read_page'],
            }
        )
        return Response(PDFReadProgressSerializer(progress).data, status=status.HTTP_200_OK)

    def get(self, request):
        filename = request.query_params.get('filename')
        queryset = PDFReadProgress.objects.filter(user=request.user)

        if filename:
            progress = queryset.filter(filename=filename).first()
            if not progress:
                return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
            return Response(PDFReadProgressSerializer(progress).data, status=status.HTTP_200_OK)

        serializer = PDFReadProgressSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SubjectListView(generics.ListCreateAPIView):
    """List user's subjects or create new one"""
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Subject.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        name = serializer.validated_data.get('name', '').strip()
        if Subject.objects.filter(user=self.request.user, name__iexact=name).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'name': f'درسی با نام "{name}" قبلاً ثبت شده است.'})
        serializer.save(user=self.request.user)


class SubjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a specific subject"""
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Ensure users can only edit/delete their own subjects
        return Subject.objects.filter(user=self.request.user)


class StudySessionListCreateView(generics.ListCreateAPIView):
    """List recent sessions or log a new one"""
    serializer_class = StudySessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StudySession.objects.filter(user=self.request.user).order_by('-start_time')

    def perform_create(self, serializer):
        # Check if subject exists by name, or create it
        subject_data = self.request.data.get('subject_name')
        subject_color = self.request.data.get('subject_color', '#10b981')
        
        if subject_data:
            # Get or create subject for this specific user
            subject, _ = Subject.objects.get_or_create(
                name=subject_data,
                user=self.request.user,
                defaults={'color_code': subject_color}
            )
            serializer.save(user=self.request.user, subject=subject)
        else:
            # Fallback if subject ID provided
            serializer.save(user=self.request.user)


class DashboardStatsView(views.APIView):
    """Get aggregated stats for dashboard"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=7)
        month_start = now - timedelta(days=30)

        # Helper to sum duration
        def get_duration(start_date):
            return StudySession.objects.filter(
                user=user,
                start_time__gte=start_date
            ).aggregate(total=Sum('duration_seconds'))['total'] or 0

        stats = {
            'today': get_duration(today_start),
            'week': get_duration(week_start),
            'month': get_duration(month_start),
            'total_sessions': StudySession.objects.filter(user=user).count()
        }
        
        return Response(stats)


class CreateTicketView(generics.CreateAPIView):
    """دانش‌آموز تیکت جدید می‌فرستد - مشاوره → مدیر مدرسه / پشتیبانی → سوپرادمین"""
    serializer_class = ConsultantTicketSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class StudentTicketListView(views.APIView):
    """دانش‌آموز تیکت‌های خودش را با پاسخ‌ها می‌بیند"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tickets = ConsultantTicket.objects.filter(user=request.user)
        serializer = StudentTicketDetailSerializer(tickets, many=True)
        return Response(serializer.data)


# ==================== Manager Ticket Views ====================

class ManagerTicketListView(views.APIView):
    """مدیر مدرسه تیکت‌های مشاوره دانش‌آموزان مدرسه‌اش را می‌بیند"""
    permission_classes = [IsAuthenticated, IsManager]

    def get(self, request):
        manager_school = request.user.profile.school
        if not manager_school:
            return Response({'error': 'مدیر به هیچ مدرسه‌ای متصل نیست'}, status=status.HTTP_400_BAD_REQUEST)

        tickets = ConsultantTicket.objects.filter(
            ticket_type='consultant',
            user__profile__school=manager_school,
            user__profile__role='student'
        ).select_related('user__profile', 'replied_by__profile')

        serializer = ManagerTicketSerializer(tickets, many=True)
        unread_count = tickets.filter(reply__isnull=True).count()
        return Response({
            'tickets': serializer.data,
            'unread_count': unread_count
        })


class ManagerTicketReplyView(views.APIView):
    """مدیر مدرسه به تیکت پاسخ می‌دهد"""
    permission_classes = [IsAuthenticated, IsManager]

    def post(self, request, ticket_id):
        manager_school = request.user.profile.school
        if not manager_school:
            return Response({'error': 'مدیر به هیچ مدرسه‌ای متصل نیست'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ticket = ConsultantTicket.objects.get(
                id=ticket_id,
                ticket_type='consultant',
                user__profile__school=manager_school
            )
        except ConsultantTicket.DoesNotExist:
            return Response({'error': 'تیکت یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TicketReplySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        ticket.reply = serializer.validated_data['reply']
        ticket.replied_by = request.user
        ticket.replied_at = timezone.now()
        ticket.is_resolved = True
        ticket.save()

        return Response(ManagerTicketSerializer(ticket).data)


# ==================== SuperAdmin Ticket Views ====================

class SuperAdminTicketListView(views.APIView):
    """سوپرادمین تیکت‌های پشتیبانی را می‌بیند"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        tickets = ConsultantTicket.objects.filter(
            ticket_type='support'
        ).select_related('user__profile', 'replied_by__profile')

        serializer = ManagerTicketSerializer(tickets, many=True)
        unread_count = tickets.filter(reply__isnull=True).count()
        return Response({
            'tickets': serializer.data,
            'unread_count': unread_count
        })


class SuperAdminTicketReplyView(views.APIView):
    """سوپرادمین به تیکت پشتیبانی پاسخ می‌دهد"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, ticket_id):
        try:
            ticket = ConsultantTicket.objects.get(id=ticket_id, ticket_type='support')
        except ConsultantTicket.DoesNotExist:
            return Response({'error': 'تیکت یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TicketReplySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        ticket.reply = serializer.validated_data['reply']
        ticket.replied_by = request.user
        ticket.replied_at = timezone.now()
        ticket.is_resolved = True
        ticket.save()

        return Response(ManagerTicketSerializer(ticket).data)


# ==================== Manager Panel Views ====================

class ManagerDashboardKPIView(views.APIView):
    """
    KPI Dashboard for managers - Bird's-eye view of school performance.
    Includes legacy study KPIs plus demo overview fields.
    Domains without models (teachers, exams, grades, parents, curriculum) return 0.
    """
    permission_classes = [IsAuthenticated, IsManager]

    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        week_start = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        manager_school = request.user.profile.school
        if not manager_school:
            return Response({
                'error': 'مدیر به هیچ مدرسه‌ای متصل نیست'
            }, status=status.HTTP_400_BAD_REQUEST)

        students_qs = UserProfile.objects.filter(role='student', school=manager_school)
        total_students = students_qs.count()

        empty_payload = {
            'avg_study_today': '0:00',
            'avg_study_today_seconds': 0,
            'change_percent': 0,
            'top_student': {'name': 'هیچ کس', 'total': 0},
            'absent_count': 0,
            'active_now': 0,
            'total_students': 0,
            'total_teachers': 0,
            'total_exams': 0,
            'total_classes': 0,
            'active_classes': 0,
            'at_risk_count': 0,
            'students_change_percent': 0,
            'teachers_change_percent': 0,
            'exams_change_percent': 0,
            'classes_change_percent': 0,
            'at_risk_change': 0,
            'avg_grade': None,
            'avg_grade_change_percent': 0,
            'attendance_rate': 0,
            'attendance_change_percent': 0,
            'school_performance': 0,
            'school_performance_change_percent': 0,
            'parent_participation': 0,
            'curriculum_progress': 0,
            'student_teacher_ratio': '0:0',
            'student_participation_rate': 0,
            'attendance_trend_30d': [],
            'performance_distribution': [
                {'name': 'عالی', 'value': 0, 'color': '#10B981'},
                {'name': 'خوب', 'value': 0, 'color': '#34D399'},
                {'name': 'متوسط', 'value': 0, 'color': '#F59E0B'},
                {'name': 'نیاز به بهبود', 'value': 0, 'color': '#EF4444'},
            ],
            'top_students_week': [],
        }

        classes_qs = SchoolClass.objects.filter(school=manager_school)
        total_classes = classes_qs.count()
        active_classes = classes_qs.filter(is_active=True).count()

        # Domains not modeled yet
        total_teachers = 0
        total_exams = 0
        avg_grade = None
        parent_participation = 0
        curriculum_progress = 0

        if total_students == 0:
            empty_payload['total_classes'] = total_classes
            empty_payload['active_classes'] = active_classes
            serializer = ManagerDashboardKPISerializer(empty_payload)
            return Response(serializer.data)

        # --- Legacy study KPIs ---
        today_totals = StudySession.objects.filter(
            user__profile__role='student',
            user__profile__school=manager_school,
            start_time__gte=today_start,
        ).aggregate(total=Sum('duration_seconds'))['total'] or 0
        avg_today = today_totals // total_students

        yesterday_totals = StudySession.objects.filter(
            user__profile__role='student',
            user__profile__school=manager_school,
            start_time__gte=yesterday_start,
            start_time__lt=today_start,
        ).aggregate(total=Sum('duration_seconds'))['total'] or 0
        avg_yesterday = yesterday_totals // total_students

        if avg_yesterday > 0:
            change_percent = ((avg_today - avg_yesterday) / avg_yesterday) * 100
        else:
            change_percent = 100 if avg_today > 0 else 0

        hours = avg_today // 3600
        minutes = (avg_today % 3600) // 60
        avg_today_str = f'{hours}:{minutes:02d}'

        top_student_data = StudySession.objects.filter(
            user__profile__role='student',
            user__profile__school=manager_school,
            start_time__gte=today_start,
        ).values('user').annotate(total=Sum('duration_seconds')).order_by('-total').first()

        if top_student_data:
            top_user = User.objects.select_related('profile').get(id=top_student_data['user'])
            top_student = {
                'name': top_user.profile.full_name or top_user.profile.phone_number,
                'total': top_student_data['total'],
            }
        else:
            top_student = {'name': 'هیچ کس', 'total': 0}

        active_users_today = set(
            StudySession.objects.filter(
                start_time__gte=today_start,
                user__profile__school=manager_school,
                user__profile__role='student',
            ).values_list('user_id', flat=True).distinct()
        )
        absent_count = max(0, total_students - len(active_users_today))

        active_now = UserProfile.objects.filter(
            role='student',
            school=manager_school,
            is_studying=True,
        ).count()

        # --- Week totals per student (for top / at-risk / distribution) ---
        week_rows = (
            StudySession.objects.filter(
                user__profile__role='student',
                user__profile__school=manager_school,
                start_time__gte=week_start,
            )
            .values('user_id', 'user__profile__full_name', 'user__profile__phone_number', 'user__profile__grade')
            .annotate(week_total=Sum('duration_seconds'))
        )
        week_map = {row['user_id']: row for row in week_rows}

        threshold = manager_school.normal_study_threshold or 21600
        weekly_threshold = threshold * 3
        at_risk_count = 0
        for profile in students_qs.only('user_id'):
            week_total = week_map.get(profile.user_id, {}).get('week_total', 0) or 0
            if week_total < weekly_threshold:
                at_risk_count += 1

        # Top 5 by week study time — score = hours (1 decimal)
        top_sorted = sorted(week_map.values(), key=lambda r: r['week_total'] or 0, reverse=True)[:5]
        grade_labels = dict(UserProfile.GRADE_CHOICES)
        top_students_week = []
        for idx, row in enumerate(top_sorted, start=1):
            grade_code = row.get('user__profile__grade') or ''
            top_students_week.append({
                'rank': idx,
                'name': row.get('user__profile__full_name') or row.get('user__profile__phone_number') or '—',
                'grade': grade_labels.get(grade_code, grade_code) if grade_code else '',
                'score': round((row.get('week_total') or 0) / 3600, 1),
                'week_total': row.get('week_total') or 0,
            })

        # Performance distribution by week_total buckets
        excellent = good = average = needs = 0
        for profile in students_qs.only('user_id'):
            wt = week_map.get(profile.user_id, {}).get('week_total', 0) or 0
            if wt >= weekly_threshold * 1.5:
                excellent += 1
            elif wt >= weekly_threshold:
                good += 1
            elif wt >= weekly_threshold * 0.5:
                average += 1
            else:
                needs += 1

        def pct(n):
            return round((n / total_students) * 100) if total_students else 0

        performance_distribution = [
            {'name': 'عالی', 'value': pct(excellent), 'color': '#10B981'},
            {'name': 'خوب', 'value': pct(good), 'color': '#34D399'},
            {'name': 'متوسط', 'value': pct(average), 'color': '#F59E0B'},
            {'name': 'نیاز به بهبود', 'value': pct(needs), 'color': '#EF4444'},
        ]

        # Attendance rate today (proxy: students with any session today)
        attendance_rate = round((len(active_users_today) / total_students) * 100, 1) if total_students else 0

        # Yesterday attendance for change
        active_yesterday = set(
            StudySession.objects.filter(
                start_time__gte=yesterday_start,
                start_time__lt=today_start,
                user__profile__school=manager_school,
                user__profile__role='student',
            ).values_list('user_id', flat=True).distinct()
        )
        yesterday_rate = round((len(active_yesterday) / total_students) * 100, 1) if total_students else 0
        attendance_change_percent = round(attendance_rate - yesterday_rate, 1)

        # 30-day attendance trend (activity proxy)
        day_counts = (
            StudySession.objects.filter(
                user__profile__role='student',
                user__profile__school=manager_school,
                start_time__gte=month_ago,
            )
            .annotate(day=TruncDate('start_time'))
            .values('day')
            .annotate(active=Count('user_id', distinct=True))
        )
        day_map = {}
        for row in day_counts:
            day = row['day']
            if not day:
                continue
            key = day.isoformat() if hasattr(day, 'isoformat') else str(day)[:10]
            day_map[key] = row['active']

        persian_months = [
            '', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
            'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
        ]
        # Approximate Jalali label via Iran calendar string (Gregorian day/month names as fallback labels)
        attendance_trend_30d = []
        for i in range(29, -1, -1):
            day_dt = (today_start - timedelta(days=i)).date()
            key = day_dt.isoformat()
            active = day_map.get(key, 0)
            value = round((active / total_students) * 100) if total_students else 0
            # Simple Persian-digit date label (day + Gregorian month name mapped loosely)
            month_name = persian_months[day_dt.month] if 1 <= day_dt.month <= 12 else ''
            label = f'{day_dt.day} {month_name}'.strip()
            attendance_trend_30d.append({'date': label, 'value': value, 'iso': key})

        # School performance: blend of attendance + study vs threshold
        avg_week = (
            StudySession.objects.filter(
                user__profile__role='student',
                user__profile__school=manager_school,
                start_time__gte=week_start,
            ).aggregate(total=Sum('duration_seconds'))['total'] or 0
        ) // total_students
        study_score = min(100, round((avg_week / weekly_threshold) * 100)) if weekly_threshold else 0
        school_performance = round((attendance_rate * 0.4) + (study_score * 0.6), 1)

        student_participation_rate = attendance_rate
        student_teacher_ratio = f'{total_students}:0' if total_teachers == 0 else f'{round(total_students / total_teachers)}:1'

        data = {
            'avg_study_today': avg_today_str,
            'avg_study_today_seconds': avg_today,
            'change_percent': round(change_percent, 1),
            'top_student': top_student,
            'absent_count': absent_count,
            'active_now': active_now,
            'total_students': total_students,
            'total_teachers': total_teachers,
            'total_exams': total_exams,
            'total_classes': total_classes,
            'active_classes': active_classes,
            'at_risk_count': at_risk_count,
            'students_change_percent': 0,
            'teachers_change_percent': 0,
            'exams_change_percent': 0,
            'classes_change_percent': 0,
            'at_risk_change': 0,
            'avg_grade': avg_grade,
            'avg_grade_change_percent': 0,
            'attendance_rate': attendance_rate,
            'attendance_change_percent': attendance_change_percent,
            'school_performance': school_performance,
            'school_performance_change_percent': 0,
            'parent_participation': parent_participation,
            'curriculum_progress': curriculum_progress,
            'student_teacher_ratio': student_teacher_ratio,
            'student_participation_rate': student_participation_rate,
            'attendance_trend_30d': attendance_trend_30d,
            'performance_distribution': performance_distribution,
            'top_students_week': top_students_week,
        }

        serializer = ManagerDashboardKPISerializer(data)
        return Response(serializer.data)


class ManagerStudentListView(views.APIView):
    """
    List all students with their stats and trends
    """
    permission_classes = [IsAuthenticated, IsManager]
    
    def get(self, request):
        # Check if manager has a school
        manager_school = request.user.profile.school
        if not manager_school:
            return Response({
                'error': 'مدیر به هیچ مدرسه‌ای متصل نیست'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get filter parameters
        grade_filter = request.query_params.get('grade', None)
        olympiad_filter = request.query_params.get('olympiad', None)
        search = request.query_params.get('search', None)
        
        # Base queryset - only students in manager's school
        students = UserProfile.objects.filter(
            role='student',
            school=manager_school
        )
        
        # Apply filters
        if grade_filter:
            students = students.filter(grade=grade_filter)
        if olympiad_filter:
            students = students.filter(olympiad_field=olympiad_filter)
        if search:
            students = students.filter(
                Q(full_name__icontains=search) | Q(phone_number__icontains=search)
            )
        
        # Calculate stats for each student
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=7)
        last_week_start = now - timedelta(days=14)
        
        students_data = []
        for profile in students:
            user = profile.user
            
            # Today's total
            today_total = StudySession.objects.filter(
                user=user,
                start_time__gte=today_start
            ).aggregate(total=Sum('duration_seconds'))['total'] or 0
            
            # This week's total
            week_total = StudySession.objects.filter(
                user=user,
                start_time__gte=week_start
            ).aggregate(total=Sum('duration_seconds'))['total'] or 0
            
            # Last week's total for trend
            last_week_total = StudySession.objects.filter(
                user=user,
                start_time__gte=last_week_start,
                start_time__lt=week_start
            ).aggregate(total=Sum('duration_seconds'))['total'] or 0
            
            # Calculate trend
            if last_week_total > 0:
                trend_percent = ((week_total - last_week_total) / last_week_total) * 100
                if trend_percent > 5:
                    trend = 'up'
                elif trend_percent < -5:
                    trend = 'down'
                else:
                    trend = 'stable'
            else:
                trend_percent = 100 if week_total > 0 else 0
                trend = 'up' if week_total > 0 else 'stable'
            
            # Last activity
            last_session = StudySession.objects.filter(user=user).order_by('-start_time').first()
            last_activity = last_session.start_time if last_session else None
            
            students_data.append({
                'user_id': user.id,
                'full_name': profile.full_name,
                'phone_number': profile.phone_number,
                'grade': profile.grade,
                'olympiad_field': profile.olympiad_field,
                'today_total': today_total,
                'week_total': week_total,
                'trend': trend,
                'trend_percent': round(trend_percent, 1),
                'last_activity': last_activity
            })
        
        # Sort by week_total descending
        students_data.sort(key=lambda x: x['week_total'], reverse=True)
        
        serializer = ManagerStudentListSerializer(students_data, many=True)
        return Response({
            'students': serializer.data,
            'count': len(students_data)
        })


class ManagerStudentProfileView(views.APIView):
    """
    Get detailed profile of a specific student (returns complete dashboard data)
    """
    permission_classes = [IsAuthenticated, IsManager]
    
    def get(self, request, user_id):
        # Ensure manager can only see students from their school
        try:
            manager_profile = request.user.profile
            manager_school = manager_profile.school
        except UserProfile.DoesNotExist:
            return Response({'error': 'Manager profile not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not manager_school:
            return Response({'error': 'Manager has no school assigned'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # First get the user to ensure existence
            user = User.objects.get(id=user_id)
            
            # Then check if they are a student in the manager's school
            # We use filter to avoid DoesNotExist if profile is missing (though unlikely)
            if not hasattr(user, 'profile'):
                 return Response({'error': 'User has no profile'}, status=status.HTTP_404_NOT_FOUND)
                 
            if user.profile.role != 'student':
                 return Response({'error': 'User is not a student'}, status=status.HTTP_404_NOT_FOUND)
            
            if user.profile.school != manager_school:
                 return Response({'error': 'Student not in your school'}, status=status.HTTP_403_FORBIDDEN)
                 
        except User.DoesNotExist:
            return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get time-based stats
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=7)
        month_start = now - timedelta(days=30)
        
        def get_duration(start_date):
            return StudySession.objects.filter(
                user=user,
                start_time__gte=start_date
            ).aggregate(total=Sum('duration_seconds'))['total'] or 0
        
        # Get recent sessions (last 10)
        recent_sessions = StudySession.objects.filter(user=user).order_by('-start_time')[:10]
        sessions_data = []
        for session in recent_sessions:
            sessions_data.append({
                'id': session.id,
                'subject': session.subject.name if session.subject else 'بدون موضوع',
                'subject_color': session.subject.color_code if session.subject else '#gray',
                'duration_seconds': session.duration_seconds,
                'start_time': session.start_time.isoformat(),
                'end_time': session.end_time.isoformat() if session.end_time else None,
                'description': session.description or ''
            })
        
        # Get subject breakdown (total time per subject)
        subject_stats = StudySession.objects.filter(user=user).values(
            'subject__name', 'subject__color_code'
        ).annotate(
            total_seconds=Sum('duration_seconds')
        ).order_by('-total_seconds')
        
        subjects_breakdown = []
        for stat in subject_stats:
            if stat['subject__name']:
                subjects_breakdown.append({
                    'name': stat['subject__name'],
                    'color': stat['subject__color_code'] or '#10b981',
                    'total_seconds': stat['total_seconds']
                })
        
        # Get heatmap data (last 60 days)
        heatmap_start = now - timedelta(days=60)
        heatmap_sessions = StudySession.objects.filter(
            user=user,
            start_time__gte=heatmap_start
        ).values('start_time__date').annotate(
            total_seconds=Sum('duration_seconds')
        )
        
        heatmap_data = {}
        for item in heatmap_sessions:
            date_str = item['start_time__date'].isoformat()
            heatmap_data[date_str] = item['total_seconds']
        
        stats = {
            'student_name': user.profile.full_name,
            'phone_number': user.profile.phone_number,
            'grade': user.profile.grade,
            'olympiad_field': user.profile.olympiad_field,
            'today': get_duration(today_start),
            'week': get_duration(week_start),
            'month': get_duration(month_start),
            'total_sessions': StudySession.objects.filter(user=user).count(),
            'recent_sessions': sessions_data,
            'subjects_breakdown': subjects_breakdown,
            'heatmap_data': heatmap_data
        }
        
        return Response(stats)


class ManagerExportExcelView(views.APIView):
    """
    Export students performance data to Excel
    """
    permission_classes = [IsAuthenticated, IsManager]
    
    def get(self, request):
        try:
            from openpyxl import Workbook
            from openpyxl.styles import Font, PatternFill, Alignment
        except ImportError:
            return Response(
                {'error': 'openpyxl library not installed. Install it with: pip install openpyxl'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Get date range from query params
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        if start_date_str and end_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            end_date = end_date.replace(hour=23, minute=59, second=59)
        else:
            # Default: last 30 days
            end_date = timezone.now()
            start_date = end_date - timedelta(days=30)
        
        # Create workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "گزارش عملکرد"
        
        # Header style
        header_fill = PatternFill(start_color="10b981", end_color="10b981", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")
        
        # Headers
        headers = ['نام', 'شماره تماس', 'پایه', 'رشته المپیاد', 'مجموع ساعات مطالعه', 'تعداد جلسات']
        ws.append(headers)
        
        for cell in ws[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center')
        
        # Get manager's school
        manager_school = request.user.profile.school
        if not manager_school:
            return Response({'error': 'Manager has no school assigned'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Get all students in the manager's school
        students = UserProfile.objects.filter(role='student', school=manager_school)
        
        for profile in students:
            user = profile.user
            
            # Calculate total study time in date range
            total_seconds = StudySession.objects.filter(
                user=user,
                start_time__gte=start_date,
                start_time__lte=end_date
            ).aggregate(total=Sum('duration_seconds'))['total'] or 0
            
            hours = total_seconds / 3600
            
            session_count = StudySession.objects.filter(
                user=user,
                start_time__gte=start_date,
                start_time__lte=end_date
            ).count()
            
            ws.append([
                profile.full_name,
                profile.phone_number,
                profile.get_grade_display(),
                profile.get_olympiad_field_display(),
                f"{hours:.2f}",
                session_count
            ])
        
        # Adjust column widths
        ws.column_dimensions['A'].width = 20
        ws.column_dimensions['B'].width = 15
        ws.column_dimensions['C'].width = 12
        ws.column_dimensions['D'].width = 15
        ws.column_dimensions['E'].width = 20
        ws.column_dimensions['F'].width = 15
        
        # Create response
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename=student_report_{start_date.strftime("%Y%m%d")}_{end_date.strftime("%Y%m%d")}.xlsx'
        
        wb.save(response)
        return response


class ManagerStudentReportPDFView(views.APIView):
    """
    Generate PDF report for a specific student
    """
    permission_classes = [IsAuthenticated, IsManager]
    
    def get(self, request, user_id):
        return Response(
            {'message': 'PDF generation will be implemented in next phase. For now, use Excel export.'},
            status=status.HTTP_501_NOT_IMPLEMENTED
        )


# ==================== Manager Class Views ====================

def _get_manager_school(request):
    """مدرسه متصل به مدیر جاری؛ در صورت نبود مدرسه None"""
    try:
        return request.user.profile.school
    except UserProfile.DoesNotExist:
        return None


def _get_manager_class(request, class_id):
    """کلاس متعلق به مدرسه مدیر؛ در صورت نبود None"""
    school = _get_manager_school(request)
    if not school:
        return None
    return SchoolClass.objects.filter(id=class_id, school=school).first()


class ManagerClassListCreateView(views.APIView):
    """لیست و ایجاد کلاس‌های مدرسه توسط مدیر"""
    permission_classes = [IsAuthenticated, IsManager]

    def get(self, request):
        school = _get_manager_school(request)
        if not school:
            return Response({'error': 'مدیر به هیچ مدرسه‌ای متصل نیست'}, status=status.HTTP_400_BAD_REQUEST)

        qs = SchoolClass.objects.filter(school=school).prefetch_related('enrollments')

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))

        grade = request.query_params.get('grade', '').strip()
        if grade:
            qs = qs.filter(grade=grade)

        is_active = request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ('true', '1', 'yes'))

        serializer = SchoolClassSerializer(qs, many=True)
        active_count = qs.filter(is_active=True).count()
        total_students = ClassEnrollment.objects.filter(school_class__school=school).count()

        return Response({
            'classes': serializer.data,
            'count': qs.count(),
            'active_count': active_count,
            'total_students': total_students,
        })

    def post(self, request):
        school = _get_manager_school(request)
        if not school:
            return Response({'error': 'مدیر به هیچ مدرسه‌ای متصل نیست'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = SchoolClassSerializer(data=request.data, context={'school': school})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        school_class = serializer.save(school=school)
        return Response(
            SchoolClassSerializer(school_class).data,
            status=status.HTTP_201_CREATED,
        )


class ManagerClassDetailView(views.APIView):
    """دریافت، ویرایش یا حذف یک کلاس"""
    permission_classes = [IsAuthenticated, IsManager]

    def get(self, request, class_id):
        school_class = _get_manager_class(request, class_id)
        if not school_class:
            return Response({'error': 'کلاس یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
        return Response(SchoolClassSerializer(school_class).data)

    def put(self, request, class_id):
        return self._update(request, class_id, partial=False)

    def patch(self, request, class_id):
        return self._update(request, class_id, partial=True)

    def _update(self, request, class_id, partial):
        school = _get_manager_school(request)
        school_class = _get_manager_class(request, class_id)
        if not school_class:
            return Response({'error': 'کلاس یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SchoolClassSerializer(
            school_class,
            data=request.data,
            partial=partial,
            context={'school': school},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, class_id):
        school_class = _get_manager_class(request, class_id)
        if not school_class:
            return Response({'error': 'کلاس یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
        school_class.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ManagerClassStudentsView(views.APIView):
    """لیست و افزودن دانش‌آموزان به کلاس"""
    permission_classes = [IsAuthenticated, IsManager]

    def get(self, request, class_id):
        school_class = _get_manager_class(request, class_id)
        if not school_class:
            return Response({'error': 'کلاس یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        enrollments = (
            ClassEnrollment.objects
            .filter(school_class=school_class)
            .select_related('student')
            .order_by('student__full_name', 'student__phone_number')
        )

        search = request.query_params.get('search', '').strip()
        if search:
            enrollments = enrollments.filter(
                Q(student__full_name__icontains=search)
                | Q(student__phone_number__icontains=search)
            )

        grade = request.query_params.get('grade', '').strip()
        if grade:
            enrollments = enrollments.filter(student__grade=grade)

        students_data = []
        for enrollment in enrollments:
            profile = enrollment.student
            students_data.append({
                'user_id': profile.user_id,
                'full_name': profile.full_name,
                'phone_number': profile.phone_number,
                'grade': profile.grade,
                'grade_display': profile.get_grade_display() if profile.grade else '',
                'enrolled_at': enrollment.enrolled_at,
            })

        serializer = ClassStudentSerializer(students_data, many=True)
        return Response({
            'class_id': school_class.id,
            'class_name': school_class.name,
            'students': serializer.data,
            'count': len(students_data),
        })

    def post(self, request, class_id):
        school = _get_manager_school(request)
        school_class = _get_manager_class(request, class_id)
        if not school_class:
            return Response({'error': 'کلاس یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ClassEnrollmentRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        student_ids = serializer.validated_data['student_ids']
        students = UserProfile.objects.filter(
            user_id__in=student_ids,
            role='student',
            school=school,
        )
        found_ids = set(students.values_list('user_id', flat=True))
        missing_ids = [sid for sid in student_ids if sid not in found_ids]
        if missing_ids:
            return Response(
                {'error': 'برخی دانش‌آموزان یافت نشدند یا متعلق به این مدرسه نیستند', 'missing_ids': missing_ids},
                status=status.HTTP_400_BAD_REQUEST,
            )

        already_enrolled = set(
            ClassEnrollment.objects
            .filter(school_class=school_class, student__user_id__in=student_ids)
            .values_list('student__user_id', flat=True)
        )

        created = []
        skipped = list(already_enrolled)
        for profile in students:
            if profile.user_id in already_enrolled:
                continue
            ClassEnrollment.objects.create(school_class=school_class, student=profile)
            created.append(profile.user_id)

        return Response({
            'message': f'{len(created)} دانش‌آموز به کلاس اضافه شد',
            'added': created,
            'skipped': skipped,
            'student_count': school_class.enrollments.count(),
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ManagerClassStudentRemoveView(views.APIView):
    """حذف دانش‌آموز از کلاس"""
    permission_classes = [IsAuthenticated, IsManager]

    def delete(self, request, class_id, user_id):
        school_class = _get_manager_class(request, class_id)
        if not school_class:
            return Response({'error': 'کلاس یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        deleted, _ = ClassEnrollment.objects.filter(
            school_class=school_class,
            student__user_id=user_id,
            student__role='student',
        ).delete()

        if deleted == 0:
            return Response({'error': 'دانش‌آموز در این کلاس یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'message': 'دانش‌آموز از کلاس حذف شد',
            'student_count': school_class.enrollments.count(),
        })


# ==================== Notification Helpers ====================

def _get_notifications_for_user(user):
    """
    برمی‌گرداند Queryset نوتیفیکیشن‌هایی که این کاربر باید ببیند.
    سوپرادمین هیچ نوتیفیکیشنی دریافت نمی‌کند.
    """
    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        return Notification.objects.none()

    if profile.is_superadmin:
        return Notification.objects.none()

    role   = profile.role
    school = profile.school

    q = Q(target_type=Notification.TARGET_ALL)

    if role == 'student':
        q |= Q(target_type=Notification.TARGET_ALL_STUDENTS)

    if school:
        q |= Q(target_type=Notification.TARGET_SCHOOL_ALL,      target_schools=school)
        if role == 'student':
            q |= Q(target_type=Notification.TARGET_SCHOOL_STUDENTS, target_schools=school)

    return Notification.objects.filter(q, is_active=True).distinct()


# ==================== Notification Views ====================

class NotificationListView(views.APIView):
    """دریافت نوتیفیکیشن‌های کاربر جاری + تعداد نخوانده"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user          = request.user
        notifications = _get_notifications_for_user(user)
        read_ids      = set(
            NotificationRead.objects.filter(
                user=user, notification__in=notifications
            ).values_list('notification_id', flat=True)
        )

        serializer   = NotificationSerializer(
            notifications, many=True, context={'read_ids': read_ids}
        )
        unread_count = notifications.exclude(id__in=read_ids).count()

        return Response({
            'notifications': serializer.data,
            'unread_count':  unread_count,
        })


class NotificationUnreadCountView(views.APIView):
    """فقط تعداد نوتیفیکیشن‌های نخوانده (برای polling سبک)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user          = request.user
        notifications = _get_notifications_for_user(user)
        read_ids      = NotificationRead.objects.filter(
            user=user, notification__in=notifications
        ).values_list('notification_id', flat=True)
        unread_count  = notifications.exclude(id__in=read_ids).count()
        return Response({'unread_count': unread_count})


class NotificationMarkReadView(views.APIView):
    """علامت‌گذاری همه نوتیفیکیشن‌های کاربر به‌عنوان خوانده‌شده"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user          = request.user
        notifications = _get_notifications_for_user(user)
        existing_read = set(
            NotificationRead.objects.filter(
                user=user, notification__in=notifications
            ).values_list('notification_id', flat=True)
        )
        to_create = [
            NotificationRead(user=user, notification=n)
            for n in notifications
            if n.id not in existing_read
        ]
        NotificationRead.objects.bulk_create(to_create, ignore_conflicts=True)
        return Response({'status': 'ok', 'marked': len(to_create)})


# ==================== SuperAdmin Notification Views ====================

class SuperAdminNotificationView(views.APIView):
    """ارسال و مدیریت نوتیفیکیشن‌ها توسط سوپرادمین"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        """لیست نوتیفیکیشن‌های ارسال‌شده"""
        notifications = Notification.objects.filter(sender=request.user)
        data = []
        for n in notifications:
            school_targets = (Notification.TARGET_SCHOOL_ALL, Notification.TARGET_SCHOOL_STUDENTS)
            reach = 0
            if n.target_type == Notification.TARGET_ALL:
                reach = UserProfile.objects.filter(is_superadmin=False).count()
            elif n.target_type == Notification.TARGET_ALL_STUDENTS:
                reach = UserProfile.objects.filter(role='student').count()
            elif n.target_type in school_targets:
                qs = UserProfile.objects.filter(school__in=n.target_schools.all())
                if n.target_type == Notification.TARGET_SCHOOL_STUDENTS:
                    qs = qs.filter(role='student')
                reach = qs.count()
            data.append({
                'id':          n.id,
                'title':       n.title,
                'body':        n.body,
                'target_type': n.get_target_type_display(),
                'created_at':  n.created_at,
                'reach_count': reach,
                'target_schools': [{'id': s.id, 'name': s.name} for s in n.target_schools.all()],
            })
        return Response(data)

    def post(self, request):
        """ارسال نوتیفیکیشن جدید"""
        serializer = SendNotificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data        = serializer.validated_data
        target_type = data['target_type']
        school_ids  = data.get('school_ids', [])

        notification = Notification.objects.create(
            title=data['title'],
            body=data['body'],
            sender=request.user,
            target_type=target_type,
        )

        school_targets = (Notification.TARGET_SCHOOL_ALL, Notification.TARGET_SCHOOL_STUDENTS)
        if school_ids and target_type in school_targets:
            schools = School.objects.filter(id__in=school_ids)
            notification.target_schools.set(schools)

        return Response({
            'id':      notification.id,
            'message': 'نوتیفیکیشن با موفقیت ارسال شد',
        }, status=status.HTTP_201_CREATED)

    def delete(self, request):
        """حذف نوتیفیکیشن (غیرفعال کردن)"""
        notif_id = request.query_params.get('id')
        if not notif_id:
            return Response({'error': 'id الزامی است'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            notif = Notification.objects.get(id=notif_id, sender=request.user)
            notif.is_active = False
            notif.save()
            return Response({'status': 'deleted'})
        except Notification.DoesNotExist:
            return Response({'error': 'نوتیفیکیشن یافت نشد'}, status=status.HTTP_404_NOT_FOUND)


# ==================== SuperAdmin Panel Views ====================

class SuperAdminSchoolListCreateView(generics.ListCreateAPIView):
    """
    List all schools or create a new school (SuperAdmin only)
    """
    serializer_class = SchoolSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    queryset = School.objects.all()


class SuperAdminSchoolDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Get, update or delete a specific school (SuperAdmin only)
    """
    serializer_class = SchoolSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    queryset = School.objects.all()


class SuperAdminAssignManagerView(views.APIView):
    """
    Assign a manager to a school (SuperAdmin only)
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def post(self, request, school_id):
        try:
            school = School.objects.get(id=school_id)
        except School.DoesNotExist:
            return Response({'error': 'مدرسه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = AssignManagerSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        phone_number = serializer.validated_data['phone_number']
        
        # Get or create user with this phone number
        user, created = User.objects.get_or_create(username=phone_number)
        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={'phone_number': phone_number}
        )
        
        # Remove manager role from previous manager of this school (if exists)
        previous_managers = UserProfile.objects.filter(school=school, role='manager')
        for prev_manager in previous_managers:
            prev_manager.role = 'student'
            prev_manager.save()
        
        # Assign new manager
        profile.school = school
        profile.role = 'manager'
        profile.save()
        
        return Response({
            'message': f'مدیر با شماره {phone_number} به مدرسه {school.name} اختصاص یافت',
            'manager': {
                'phone_number': phone_number,
                'full_name': profile.full_name or 'تعیین نشده',
                'school': school.name
            }
        })


class SuperAdminSchoolMembersView(views.APIView):
    """
    Get list of all members (students + manager) of a school
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get(self, request, school_id):
        try:
            school = School.objects.get(id=school_id)
        except School.DoesNotExist:
            return Response({'error': 'مدرسه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
        
        members = UserProfile.objects.filter(school=school)
        
        members_data = []
        for profile in members:
            members_data.append({
                'id': profile.user.id,
                'full_name': profile.full_name,
                'phone_number': profile.phone_number,
                'role': profile.get_role_display(),
                'grade': profile.get_grade_display() if profile.grade else '-',
                'is_profile_complete': profile.is_profile_complete
            })
        
        return Response({
            'school': SchoolSerializer(school).data,
            'members': members_data,
            'total_count': len(members_data)
        })


class SuperAdminCreateStudentView(views.APIView):
    """
    ایجاد دانش‌آموز به‌صورت دستی برای یک مدرسه (سوپرادمین)
    رمز عبور بدون اعتبارسنجی پیچیدگی عمومی ثبت‌نام
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, school_id):
        try:
            school = School.objects.get(id=school_id)
        except School.DoesNotExist:
            return Response({'error': 'مدرسه یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SuperAdminManualStudentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        phone_number = serializer.validated_data['phone_number'].strip()
        password = serializer.validated_data['password']

        if User.objects.filter(username=phone_number).exists():
            return Response(
                {'error': 'کاربری با این شماره از قبل وجود دارد'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create(
            username=phone_number,
            password=make_password(password),
        )
        profile = UserProfile.objects.create(
            user=user,
            phone_number=phone_number,
            full_name=serializer.validated_data.get('full_name') or '',
            grade=serializer.validated_data.get('grade') or '',
            olympiad_field=serializer.validated_data.get('olympiad_field') or '',
            school=school,
            role='student',
            is_password_set=True,
            is_profile_complete=True,
        )

        return Response(
            {
                'message': 'دانش‌آموز ثبت شد',
                'student': {
                    'id': user.id,
                    'full_name': profile.full_name,
                    'phone_number': profile.phone_number,
                    'grade': profile.get_grade_display() if profile.grade else '',
                    'school': school.name,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class CalendarEventListCreateView(generics.ListCreateAPIView):
    """لیست رویدادهای تقویم کاربر یا ایجاد رویداد جدید (پشتیبانی از bulk create)"""
    serializer_class = CalendarEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CalendarEvent.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        many = isinstance(request.data, list)
        serializer = self.get_serializer(data=request.data, many=many)
        serializer.is_valid(raise_exception=True)

        if many:
            validated = serializer.validated_data
            events = [
                CalendarEvent(user=request.user, **item)
                for item in validated
            ]
            CalendarEvent.objects.bulk_create(events, ignore_conflicts=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CalendarEventDetailView(generics.RetrieveUpdateDestroyAPIView):
    """دریافت، ویرایش یا حذف یک رویداد با client_id"""
    serializer_class = CalendarEventSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'client_id'

    def get_queryset(self):
        return CalendarEvent.objects.filter(user=self.request.user)


class CalendarEventGroupView(views.APIView):
    """حذف یا ویرایش همه رویدادهای یک گروه"""
    permission_classes = [IsAuthenticated]

    def _group_qs(self, request, group_id):
        return CalendarEvent.objects.filter(
            user=request.user, group_id=group_id,
        ).exclude(group_id='')

    def delete(self, request, group_id):
        deleted, _ = self._group_qs(request, group_id).delete()
        if deleted == 0:
            return Response({'detail': 'گروه یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def patch(self, request, group_id):
        qs = self._group_qs(request, group_id)
        if not qs.exists():
            return Response({'detail': 'گروه یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CalendarEventGroupPatchSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        qs.update(**serializer.validated_data)
        return Response({'updated': qs.count()}, status=status.HTTP_200_OK)
