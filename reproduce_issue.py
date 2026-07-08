import os
import django
from django.conf import settings

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'desko_backend.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile, School, StudySession
from rest_framework.test import APIRequestFactory
from api.views import ManagerStudentProfileView
from rest_framework.request import Request

def reproduce():
    # 1. Create a Manager with a School
    school, _ = School.objects.get_or_create(name="Test School", invitation_code="TEST1234")
    
    manager_user, _ = User.objects.get_or_create(username="manager_test")
    if not hasattr(manager_user, 'profile'):
        UserProfile.objects.create(user=manager_user, role='manager', school=school)
    else:
        manager_user.profile.role = 'manager'
        manager_user.profile.school = school
        manager_user.profile.save()

    # 2. Create a Student in the same School
    student_user, _ = User.objects.get_or_create(username="student_test")
    if not hasattr(student_user, 'profile'):
        UserProfile.objects.create(user=student_user, role='student', school=school, full_name="Test Student")
    else:
        student_user.profile.role = 'student'
        student_user.profile.school = school
        student_user.profile.full_name = "Test Student"
        student_user.profile.save()
        
    print(f"Manager ID: {manager_user.id}")
    print(f"Student ID: {student_user.id}")

    # 3. Simulate Request
    factory = APIRequestFactory()
    view = ManagerStudentProfileView.as_view()
    
    # URL: /manager/students/<id>/profile/
    request = factory.get(f'/manager/students/{student_user.id}/profile/')
    request.user = manager_user
    
    # We need to force authentication for the view to work with permissions
    # But since we're calling the view directly, we can just bypass permission checks 
    # if we were instantiating the view class directly, but as_view() wraps it.
    # However, forcing request.user should satisfy IsAuthenticated and IsManager (since we set the profile).

    try:
        response = view(request, user_id=student_user.id)
        print(f"Status Code: {response.status_code}")
        print(f"Data: {response.data}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    reproduce()
