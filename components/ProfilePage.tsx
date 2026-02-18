import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Coins,
  Loader2,
  RefreshCw,
  Settings,
  Sparkles,
  Star,
  BookOpenText,
  Image as ImageIcon,
  ShieldCheck,
  ArrowUpRight,
  ChevronDown,
} from 'lucide-react';
import { authAPI } from '../services/api';
import { Idea, ProfileData, User } from '../types';

interface ProfilePageProps {
  user: User;
  ideas: Idea[];
  onToggleFavorite: (idea: Idea) => Promise<void>;
  onOpenIdea: (idea: Idea) => void;
  onBackToDashboard: () => void;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('');
}

const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  ideas,
  onToggleFavorite,
  onOpenIdea,
  onBackToDashboard,
}) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteBusyIdeaId, setFavoriteBusyIdeaId] = useState<number | null>(null);
  const [isRuntimeExpanded, setIsRuntimeExpanded] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authAPI.profile();
      setProfile(res as ProfileData);
    } catch (e: any) {
      setError(e?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const favorites = useMemo(
    () =>
      ideas
        .filter((idea) => Array.isArray(idea.tags) && idea.tags.includes('Favorite'))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [ideas]
  );

  const suggestionIdeas = useMemo(
    () =>
      ideas
        .filter((idea) => !Array.isArray(idea.tags) || !idea.tags.includes('Favorite'))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 6),
    [ideas]
  );

  const ideaQuotaPct = profile
    ? clampPercent((profile.quota.ideas.used / Math.max(profile.quota.ideas.limit, 1)) * 100)
    : 0;

  const handleToggleFavoriteClick = async (idea: Idea) => {
    setFavoriteBusyIdeaId(idea.id);
    try {
      await onToggleFavorite(idea);
    } catch (e) {
      setError('Failed to update favorites. Please try again.');
    } finally {
      setFavoriteBusyIdeaId(null);
    }
  };

  return (
    <div
      className="relative rounded-[28px] border border-stone-200 bg-[#FFFEF9] overflow-hidden shadow-[0_12px_60px_rgba(0,0,0,0.07)]"
      style={{
        backgroundImage:
          'repeating-linear-gradient(transparent, transparent 31px, #E8DCC8 31px, #E8DCC8 32px)',
        backgroundPosition: '0 26px',
      }}
    >
      <div className="absolute left-14 top-0 bottom-0 w-px bg-rose-200/60 pointer-events-none" />

      <div className="relative z-10 border-b border-stone-200/60 bg-[#FFFEF9]/90 backdrop-blur-sm p-6 md:p-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-100 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-stone-900 to-stone-600 text-white flex items-center justify-center font-bold shadow-lg">
            {getInitials(user.name || 'U')}
          </div>
          <div>
            <h2 className="font-display text-3xl text-stone-900 leading-none">Profile Studio</h2>
            <p className="text-stone-500 text-xs uppercase tracking-[0.2em] mt-1">
              usage, favorites, settings
            </p>
          </div>
        </div>
        <button
          onClick={loadProfile}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="relative z-10 p-12 flex items-center justify-center text-stone-500 gap-3">
          <Loader2 className="animate-spin" size={20} />
          Loading profile metrics...
        </div>
      ) : error ? (
        <div className="relative z-10 p-12 text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      ) : profile ? (
        <div className="relative z-10 p-6 md:p-8 space-y-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <section className="xl:col-span-3 rounded-2xl bg-white/80 border border-stone-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl text-stone-900 flex items-center gap-2">
                  <BookOpenText size={18} />
                  Monthly Quota
                </h3>
                {profile.quota.ideas.is_bypass && (
                  <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                    bypass active
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-stone-700">Ideas created this month</span>
                    <span className="font-bold text-stone-900">
                      {profile.quota.ideas.used} / {profile.quota.ideas.limit}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-400"
                      style={{ width: `${ideaQuotaPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Remaining this month: {profile.quota.ideas.remaining}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-stone-200 bg-[#FFFEF9] p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-1">
                      Image Cap
                    </div>
                    <div className="text-lg font-bold text-stone-900">
                      {profile.quota.images_per_idea.limit} per idea / month
                    </div>
                    <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                      <ImageIcon size={12} />
                      {profile.quota.images_generated_this_month} generated this month
                    </p>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-[#FFFEF9] p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-1">
                      Estimated Spend
                    </div>
                    <div className="text-lg font-bold text-stone-900 flex items-center gap-2">
                      <Coins size={16} />
                      ${profile.usage.estimated_cost_usd.toFixed(2)}
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      {profile.usage.events_count} tracked events this month
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-stone-200 bg-white/75 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-stone-900 flex items-center gap-2">
                <Star size={18} />
                Favorites Board
              </h3>
              <span className="text-xs uppercase tracking-[0.2em] text-stone-500">
                {favorites.length} saved
              </span>
            </div>

            {favorites.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 bg-[#FFFEF9] p-5 text-stone-500">
                No favorites yet. Star ideas below to pin them on your board.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
                {favorites.map((idea) => (
                  <div
                    key={idea.id}
                    className="rounded-xl border border-stone-200 bg-white p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => onOpenIdea(idea)}
                        className="text-left flex-1 min-w-0"
                      >
                        <h4 className="font-display text-lg text-stone-900 truncate">{idea.title}</h4>
                        <p className="text-xs text-stone-500 mt-1">
                          Updated {new Date(idea.updated_at).toLocaleDateString()}
                        </p>
                      </button>
                      <button
                        onClick={() => handleToggleFavoriteClick(idea)}
                        disabled={favoriteBusyIdeaId === idea.id}
                        className="p-2 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-50"
                        title="Remove favorite"
                      >
                        {favoriteBusyIdeaId === idea.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Star size={14} fill="currentColor" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {suggestionIdeas.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">
                  Quick Add
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestionIdeas.map((idea) => (
                    <button
                      key={idea.id}
                      onClick={() => handleToggleFavoriteClick(idea)}
                      disabled={favoriteBusyIdeaId === idea.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors disabled:opacity-50"
                    >
                      {favoriteBusyIdeaId === idea.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Sparkles size={12} />
                      )}
                      <span className="text-sm">{idea.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-sm">
            <h3 className="font-display text-xl text-stone-900 mb-4">Monthly Image Usage by Idea</h3>
            <div className="space-y-2">
              {profile.quota.images_per_idea.usage_by_idea.slice(0, 8).map((row) => {
                const percent = clampPercent((row.used / Math.max(row.limit, 1)) * 100);
                return (
                  <div key={row.idea_id} className="rounded-xl border border-stone-200 bg-[#FFFEF9] p-3">
                    <div className="flex items-center justify-between text-sm mb-1 gap-4">
                      <span className="font-medium text-stone-800 truncate">{row.idea_title}</span>
                      <span className="text-stone-600 whitespace-nowrap">
                        {row.used}/{row.limit}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
                      <div className="h-full bg-stone-700" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
              {profile.quota.images_per_idea.usage_by_idea.length === 0 && (
                <div className="text-sm text-stone-500">No image usage yet this month.</div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-sm">
            <h3 className="font-display text-xl text-stone-900 mb-4">Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-stone-200 bg-[#FFFEF9] p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Name</div>
                <div className="font-semibold text-stone-900 mt-1">{user.name}</div>
              </div>
              <div className="rounded-xl border border-stone-200 bg-[#FFFEF9] p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Email</div>
                <div className="font-semibold text-stone-900 mt-1 break-all">{user.email}</div>
              </div>
              <div className="rounded-xl border border-stone-200 bg-[#FFFEF9] p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Role</div>
                <div className="font-semibold text-stone-900 mt-1">{user.job_role || 'Not set'}</div>
              </div>
              <div className="rounded-xl border border-stone-200 bg-[#FFFEF9] p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Joined</div>
                <div className="font-semibold text-stone-900 mt-1">
                  {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={onBackToDashboard}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-900 text-white hover:bg-black transition-colors"
              >
                Back to Seeds
                <ArrowUpRight size={14} />
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-gradient-to-br from-stone-900 to-stone-700 text-white shadow-xl overflow-hidden transition-all duration-300">
            <button 
              onClick={() => setIsRuntimeExpanded(!isRuntimeExpanded)}
              className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <h3 className="font-display text-lg flex items-center gap-2">
                <Settings size={16} className={isRuntimeExpanded ? 'animate-spin-slow' : ''} />
                Runtime
              </h3>
              <ChevronDown className={`transition-transform duration-300 ${isRuntimeExpanded ? 'rotate-180' : ''}`} size={18} />
            </button>
            
            <div className={`transition-all duration-300 ease-in-out ${isRuntimeExpanded ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
              <div className="p-5 pt-0 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-stone-300">Tier</span>
                  <span className="font-semibold uppercase">{profile.settings.tier}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-stone-300">Text Model</span>
                  <span className="font-semibold text-right">{profile.settings.text_model}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-stone-300">Image Model</span>
                  <span className="font-semibold text-right">{profile.settings.image_model}</span>
                </div>
                <div className="pt-2 border-t border-white/15 text-xs text-stone-300 flex items-center gap-2">
                  <ShieldCheck size={14} />
                  4K reserved for future subscription tiers
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default ProfilePage;
