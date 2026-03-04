import { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, User, Shield, Database, Loader2, AlertTriangle, Download, Trash2, Check, FlaskConical, X } from 'lucide-react';
import { authApi, researchApi } from '../api';
import { useAuth } from '../context/AuthContext';
import type { UserUpdate, ConsentTerms, ConsentResponse } from '../api/types';

const ageBrackets = ['', 'Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const genderCategories = ['', 'Male', 'Female', 'Non-binary', 'Prefer not to say'];

export default function Settings() {
  const { user, refreshUser, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [timezone, setTimezone] = useState(user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [ageBracket, setAgeBracket] = useState(user?.age_bracket || '');
  const [genderCategory, setGenderCategory] = useState(user?.gender_category || '');
  const [region, setRegion] = useState(user?.region || '');
  const [themePreference, setThemePreference] = useState(user?.theme_preference || 'dark');
  const [dreamReminder, setDreamReminder] = useState(user?.dream_reminder_time || '');
  const [sleepReminder, setSleepReminder] = useState(user?.sleep_reminder_time || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const [consentStatus, setConsentStatus] = useState<ConsentResponse | null>(null);
  const [consentTerms, setConsentTerms] = useState<ConsentTerms | null>(null);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentActing, setConsentActing] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const fetchConsent = useCallback(async () => {
    setConsentLoading(true);
    try {
      const [terms, status] = await Promise.allSettled([
        researchApi.getTerms(),
        researchApi.getStatus(),
      ]);
      if (terms.status === 'fulfilled') setConsentTerms(terms.value);
      if (status.status === 'fulfilled') setConsentStatus(status.value);
      else setConsentStatus(null);
    } catch {
      // no consent yet is fine
    } finally {
      setConsentLoading(false);
    }
  }, []);

  useEffect(() => { fetchConsent(); }, [fetchConsent]);

  const handleGrantConsent = async () => {
    if (!consentTerms) return;
    setConsentActing(true);
    try {
      const result = await researchApi.grantConsent({
        consent_version: consentTerms.version,
        data_categories: consentTerms.data_categories,
      });
      setConsentStatus(result);
      setShowConsentModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to grant consent');
    } finally {
      setConsentActing(false);
    }
  };

  const handleRevokeConsent = async () => {
    setConsentActing(true);
    try {
      const result = await researchApi.revokeConsent();
      setConsentStatus(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to revoke consent');
    } finally {
      setConsentActing(false);
    }
  };

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileMessage('');
    setError('');
    try {
      const data: UserUpdate = {
        name: name || undefined,
        bio: bio || undefined,
        timezone: timezone || undefined,
        avatar_url: avatarUrl || undefined,
        age_bracket: ageBracket || undefined,
        gender_category: genderCategory || undefined,
        region: region || undefined,
        theme_preference: themePreference,
        dream_reminder_time: dreamReminder || undefined,
        sleep_reminder_time: sleepReminder || undefined,
      };
      await authApi.updateProfile(data);
      await refreshUser();
      setProfileMessage('Profile updated');
      setTimeout(() => setProfileMessage(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Passwords do not match');
      return;
    }
    setPasswordSaving(true);
    setPasswordMessage('');
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Password changed');
      setTimeout(() => setPasswordMessage(''), 3000);
    } catch (err: unknown) {
      setPasswordMessage(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await authApi.exportData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dreamcatcher-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return;
    setDeleting(true);
    try {
      await authApi.deleteAccount(deletePassword);
      logout();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-indigo-300" />
          Settings
        </h1>
        <p className="text-white/60 mt-1">Manage your profile and preferences</p>
      </div>

      {error && (
        <div className="card mb-4 border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Profile */}
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-indigo-300" />
            <h2 className="text-lg font-semibold text-white">Profile</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="label">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="input min-h-[80px] resize-y"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="input"
                  placeholder="America/New_York"
                />
              </div>

              <div>
                <label className="label">Avatar URL</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="input"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-white/50 text-sm">Demographics (optional)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Age Bracket</label>
                <select
                  value={ageBracket}
                  onChange={(e) => setAgeBracket(e.target.value)}
                  className="input"
                >
                  {ageBrackets.map((b) => (
                    <option key={b} value={b}>{b || 'Prefer not to say'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Gender</label>
                <select
                  value={genderCategory}
                  onChange={(e) => setGenderCategory(e.target.value)}
                  className="input"
                >
                  {genderCategories.map((g) => (
                    <option key={g} value={g}>{g || 'Prefer not to say'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Region</label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="input"
                  placeholder="e.g. North America"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-white/50 text-sm">Preferences</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Theme</span>
                <div className="flex gap-2">
                  {['dark', 'light'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setThemePreference(t)}
                      className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                        themePreference === t
                          ? 'bg-indigo-500/30 text-white'
                          : 'bg-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Dream Reminder Time</label>
                  <input
                    type="time"
                    value={dreamReminder}
                    onChange={(e) => setDreamReminder(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Sleep Reminder Time</label>
                  <input
                    type="time"
                    value={sleepReminder}
                    onChange={(e) => setSleepReminder(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            {profileMessage && (
              <span className="flex items-center gap-1 text-emerald-400 text-sm">
                <Check className="w-4 h-4" />
                {profileMessage}
              </span>
            )}
            <button
              onClick={handleProfileSave}
              disabled={profileSaving}
              className="btn-primary flex items-center gap-2"
            >
              {profileSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </button>
          </div>
        </section>

        {/* Security */}
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-indigo-300" />
            <h2 className="text-lg font-semibold text-white">Security</h2>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              {passwordMessage && (
                <span className={`text-sm ${passwordMessage.includes('changed') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {passwordMessage}
                </span>
              )}
              <button
                type="submit"
                disabled={passwordSaving}
                className="btn-primary flex items-center gap-2"
              >
                {passwordSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Research Participation */}
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical className="w-5 h-5 text-indigo-300" />
            <h2 className="text-lg font-semibold text-white">Research Participation</h2>
          </div>

          {consentLoading ? (
            <div className="flex items-center gap-2 text-white/50">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading consent status...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">
                    Status:{' '}
                    <span className={consentStatus?.status === 'active' ? 'text-emerald-400' : 'text-white/50'}>
                      {consentStatus?.status === 'active' ? 'Opted In' : 'Not Participating'}
                    </span>
                  </p>
                  <p className="text-white/50 text-sm mt-1">
                    Contribute anonymized dream data to scientific research
                  </p>
                  {consentStatus?.status === 'active' && consentStatus.consented_at && (
                    <p className="text-white/40 text-xs mt-1">
                      Consented on {new Date(consentStatus.consented_at).toLocaleDateString()}
                      {' '}(v{consentStatus.consent_version})
                    </p>
                  )}
                </div>
                <div>
                  {consentStatus?.status === 'active' ? (
                    <button
                      onClick={handleRevokeConsent}
                      disabled={consentActing}
                      className="flex items-center gap-2 px-4 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {consentActing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Opt Out'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowConsentModal(true)}
                      disabled={consentActing}
                      className="btn-primary flex items-center gap-2"
                    >
                      {consentActing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Opt In'}
                    </button>
                  )}
                </div>
              </div>

              {consentStatus?.status !== 'active' && (
                <p className="text-white/40 text-sm">
                  Your data is fully anonymized before being included in any research dataset.
                  You can opt out at any time, which permanently deletes all derived research data.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Consent Modal */}
        {showConsentModal && consentTerms && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-800 border border-white/10 rounded-2xl max-w-lg w-full mx-4 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Research Consent Agreement</h3>
                <button
                  onClick={() => setShowConsentModal(false)}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-white/70 text-sm space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                <p>{consentTerms.text}</p>
                <div>
                  <p className="text-white/50 font-medium mb-1">Data categories collected:</p>
                  <ul className="list-disc list-inside text-white/50 space-y-1">
                    {consentTerms.data_categories.map((cat) => (
                      <li key={cat}>{cat.replace(/_/g, ' ')}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-white/40 text-xs">Version {consentTerms.version}</p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConsentModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrantConsent}
                  disabled={consentActing}
                  className="btn-primary flex items-center gap-2"
                >
                  {consentActing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Granting...
                    </>
                  ) : (
                    'I Agree & Opt In'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data */}
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-indigo-300" />
            <h2 className="text-lg font-semibold text-white">Data</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">Export Your Data</p>
                <p className="text-white/50 text-sm">Download all your data as JSON</p>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="btn-secondary flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <p className="text-red-300 font-medium">Danger Zone</p>
              </div>
              <p className="text-white/50 text-sm mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>

              {showDeleteConfirm ? (
                <div className="space-y-3">
                  <div>
                    <label className="label text-red-300">Enter your password to confirm</label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="input"
                      placeholder="Your password"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeletePassword('');
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting || !deletePassword}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Delete My Account
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
