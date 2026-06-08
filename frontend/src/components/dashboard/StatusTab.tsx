import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { CircleDot, Plus, PenTool, Image, Video, X } from 'lucide-react';
import { RootState } from '../../store';
import { StatusViewer } from './StatusViewer';

export interface IStatus {
  _id: string;
  user: {
    _id: string;
    name: string;
    username: string;
    avatar: string;
  };
  type: 'text' | 'image' | 'video';
  content?: string;
  mediaUrl?: string;
  backgroundColor?: string;
  views: string[];
  createdAt: string;
}

// Segmented SVG circular border representing status items count
const StatusRing: React.FC<{ total: number; unviewed: number }> = ({ total, unviewed }) => {
  if (total === 0) return null;

  const size = 52;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;

  if (total === 1) {
    return (
      <svg className="absolute inset-0 transform -rotate-90 pointer-events-none" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={unviewed > 0 ? '#10b981' : '#4b5563'}
          strokeWidth="2.5"
        />
      </svg>
    );
  }

  const gap = 4.5; // space between segments
  const segmentLength = (circumference - total * gap) / total;

  const segments = [];
  for (let i = 0; i < total; i++) {
    // Viewed segments are colored gray, unviewed are colored green
    // Assuming unviewed ones are at the end of the collection (newest)
    const isViewed = i < total - unviewed;
    const strokeColor = isViewed ? '#4b5563' : '#10b981';
    const offset = -((segmentLength + gap) * i);

    segments.push(
      <circle
        key={i}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
        strokeDashoffset={offset}
      />
    );
  }

  return (
    <svg className="absolute inset-0 transform -rotate-90 pointer-events-none" width={size} height={size}>
      {segments}
    </svg>
  );
};

export const StatusTab: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [statuses, setStatuses] = useState<IStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal control states
  const [viewerActive, setViewerActive] = useState(false);
  const [activeStoryGroup, setActiveStoryGroup] = useState<{ user: any; statuses: IStatus[] } | null>(null);
  const [creatorMode, setCreatorMode] = useState<'text' | 'media' | null>(null);

  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchStatuses = async () => {
    try {
      const res = await fetch(`${apiHost}/api/status`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setStatuses(data);
      }
    } catch (err) {
      console.error('Fetch status error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  // Group statuses by user
  const groupedStatuses: Record<string, { user: any; statuses: IStatus[]; unviewedCount: number }> = {};

  statuses.forEach((status) => {
    const userId = status.user._id;
    const isViewed = status.views.includes(user?._id || '');

    if (!groupedStatuses[userId]) {
      groupedStatuses[userId] = {
        user: status.user,
        statuses: [],
        unviewedCount: 0,
      };
    }
    groupedStatuses[userId].statuses.push(status);
    if (!isViewed && userId !== user?._id) {
      groupedStatuses[userId].unviewedCount += 1;
    }
  });

  const myStatusGroup = groupedStatuses[user?._id || ''];
  const friendsStatusGroups = Object.values(groupedStatuses).filter(
    (g) => g.user._id !== user?._id
  );

  const handleOpenViewer = (group: { user: any; statuses: IStatus[] }) => {
    setActiveStoryGroup(group);
    setViewerActive(true);
  };

  return (
    <div className="flex flex-col h-full bg-dark-panel select-none">
      {/* Header */}
      <div className="p-4 border-b border-neutral-900 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <CircleDot className="w-5 h-5 text-dark-accent animate-pulse" />
          Status
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreatorMode('text')}
            title="Text Status"
            className="p-2 bg-neutral-950 hover:bg-neutral-900 text-dark-secondary hover:text-white rounded-xl border border-neutral-850 transition-colors"
          >
            <PenTool className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            onClick={() => setCreatorMode('media')}
            title="Media Status"
            className="p-2 bg-neutral-950 hover:bg-neutral-900 text-dark-secondary hover:text-white rounded-xl border border-neutral-850 transition-colors"
          >
            <Image className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* My Status Section */}
        <div>
          <h2 className="text-xs font-bold text-dark-secondary uppercase tracking-wider mb-3">
            My Status
          </h2>
          <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950/45 border border-neutral-900/60">
            <div
              onClick={() => {
                if (myStatusGroup && myStatusGroup.statuses.length > 0) {
                  handleOpenViewer(myStatusGroup);
                } else {
                  setCreatorMode('media');
                }
              }}
              className="flex items-center gap-3.5 cursor-pointer flex-1"
            >
              {/* Profile Image & StatusRing */}
              <div className="relative w-13 h-13 flex items-center justify-center shrink-0">
                {myStatusGroup && myStatusGroup.statuses.length > 0 ? (
                  <StatusRing
                    total={myStatusGroup.statuses.length}
                    unviewed={myStatusGroup.statuses.filter(s => !s.views.includes(user?._id || '')).length}
                  />
                ) : null}
                {user?.avatar ? (
                  <img
                    src={user.avatar.startsWith('/') ? `${apiHost}${user.avatar}` : user.avatar}
                    alt="My Avatar"
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center font-bold text-white uppercase">
                    {user?.name.charAt(0)}
                  </div>
                )}

                {(!myStatusGroup || myStatusGroup.statuses.length === 0) && (
                  <span className="absolute bottom-1 right-1 bg-emerald-500 text-slate-950 p-0.5 rounded-full border border-slate-950">
                    <Plus className="w-3.5 h-3.5 font-extrabold stroke-[3px]" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white text-sm">My Status</div>
                <div className="text-xs text-dark-secondary truncate mt-0.5">
                  {myStatusGroup && myStatusGroup.statuses.length > 0
                    ? `${myStatusGroup.statuses.length} update${myStatusGroup.statuses.length > 1 ? 's' : ''} active`
                    : 'Tap to add status update'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Updates Section */}
        <div>
          <h2 className="text-xs font-bold text-dark-secondary uppercase tracking-wider mb-3">
            Recent Updates
          </h2>
          {isLoading ? (
            <div className="text-center py-12 text-sm text-dark-secondary">Loading updates...</div>
          ) : friendsStatusGroups.length > 0 ? (
            <div className="space-y-2.5">
              {friendsStatusGroups.map((group) => {
                const latestStatus = group.statuses[group.statuses.length - 1];
                const unviewed = group.unviewedCount;

                return (
                  <div
                    key={group.user._id}
                    onClick={() => handleOpenViewer(group)}
                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-neutral-950/20 hover:bg-neutral-950/50 border border-neutral-900/40 hover:border-neutral-850 cursor-pointer transition-all flex-1"
                  >
                    <div className="relative w-13 h-13 flex items-center justify-center shrink-0">
                      <StatusRing total={group.statuses.length} unviewed={unviewed} />
                      {group.user.avatar ? (
                        <img
                          src={group.user.avatar.startsWith('/') ? `${apiHost}${group.user.avatar}` : group.user.avatar}
                          alt={group.user.name}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center font-bold text-white uppercase">
                          {group.user.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white text-sm truncate">
                        {group.user.name}
                      </div>
                      <div className="text-xs text-dark-secondary truncate mt-0.5">
                        {new Date(latestStatus.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {unviewed > 0 && (
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0 shadow-lg shadow-emerald-500/20" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-dark-secondary border border-dashed border-neutral-900 rounded-2xl">
              No recent status updates from friends
            </div>
          )}
        </div>
      </div>

      {/* Stories Viewer and Creation Modal Overlay Container */}
      <StatusViewer
        isViewerOpen={viewerActive}
        onCloseViewer={() => {
          setViewerActive(false);
          setActiveStoryGroup(null);
          fetchStatuses(); // Refresh view count status list on close
        }}
        activeStoryGroup={activeStoryGroup}
        creatorMode={creatorMode}
        onCloseCreator={() => {
          setCreatorMode(null);
          fetchStatuses(); // Refresh statuses list to show new update
        }}
      />
    </div>
  );
};
export default StatusTab;
