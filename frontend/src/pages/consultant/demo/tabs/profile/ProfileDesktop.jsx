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

export default function ProfileDesktop() {
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
    <div className="px-4 xl:px-6 pb-8 flex flex-col gap-4 min-w-0">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <ProfileHeading />
        <ProfileActions profile={profile} onLogout={logout} onMessages={jumpToReplies} />
      </header>
      <ProfileNotice notice={profile.notice} tone={profile.noticeTone} />
      <ProfileStatusBanner profile={profile} />
      <div className="grid gap-4 lg:grid-cols-[minmax(300px,0.92fr)_minmax(0,1.15fr)] items-start min-w-0">
        <div className="flex flex-col gap-4 min-w-0">
          <ProfileHero profile={profile} name={profile.identity.fullName || identity.full} />
          <WorkCalendar profile={profile} />
        </div>
        <div className="flex flex-col gap-4 min-w-0">
          <SmartSettings profile={profile} onOpenStudents={() => navigateToTab('students')} />
          <ReadyReplies profile={profile} />
          <Availability profile={profile} />
          <RosterColumns profile={profile} />
          <NotificationSettings profile={profile} />
          <SubjectCatalogCard />
          <SupportCard note={profile.supportNote} />
        </div>
      </div>
    </div>
  );
}
