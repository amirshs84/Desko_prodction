import { Menu } from 'lucide-react';
import { PANEL } from '../../constants/theme';
import { useConsultant } from '../../context/ConsultantContext';
import { consultantIdentity } from '../../lib/format';
import { performLogout } from '../../../../../utils/auth';
import { useConsultantProfile } from './profileModel';
import {
  Availability,
  ProfileActions,
  ProfileHeading,
  ProfileHero,
  ProfileNotice,
  ProfileStatusBanner,
  ReadyReplies,
  RosterColumns,
  NotificationSettings,
  SmartSettings,
  SubjectCatalogCard,
  SupportCard,
  WorkCalendar,
} from './profilePieces';

export default function ProfileMobile({ onMenuClick }) {
  const profile = useConsultantProfile();
  const { navigateToTab } = useConsultant();
  const identity = consultantIdentity();

  const logout = async () => {
    if (!window.confirm('آیا می‌خواهید از حساب کاربری خارج شوید؟')) return;
    await performLogout();
  };

  const jumpToReplies = (event) => {
    const scroller = event.currentTarget.closest('.overflow-y-auto');
    scroller?.querySelector('[data-profile-replies]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="px-4 sm:px-6 pb-4 max-w-3xl mx-auto w-full min-w-0 flex flex-col gap-3">
      <header className="pt-3">
        <div className="flex items-start justify-between gap-3">
          <ProfileHeading />
          <button
            type="button"
            aria-label="باز کردن منو"
            onClick={onMenuClick}
            className="w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{ color: PANEL.ink }}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>
      <ProfileActions profile={profile} onLogout={logout} onMessages={jumpToReplies} />
      <ProfileNotice notice={profile.notice} tone={profile.noticeTone} />
      <ProfileStatusBanner profile={profile} />
      <ProfileHero profile={profile} name={profile.identity.fullName || identity.full} />
      <WorkCalendar profile={profile} />
      <SmartSettings profile={profile} onOpenStudents={() => navigateToTab('students')} />
      <ReadyReplies profile={profile} />
      <Availability profile={profile} />
      <RosterColumns profile={profile} />
      <NotificationSettings profile={profile} />
      <SubjectCatalogCard />
      <SupportCard note={profile.supportNote} />
    </div>
  );
}
