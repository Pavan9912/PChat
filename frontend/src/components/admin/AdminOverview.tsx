import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Users, MessageSquare, ShieldAlert, BarChart3, AlertCircle, Ban, Trash2, CheckCircle } from 'lucide-react';
import { RootState } from '../../store';
import {
  adminStart,
  fetchAnalyticsSuccess,
  fetchUsersSuccess,
  fetchReportsSuccess,
  updateUserBanStatus,
  removeUserSuccess,
  resolveReportSuccess,
  adminFailure,
} from '../../store/slices/adminSlice';
import { UserSummary } from '../../store/slices/chatSlice';
import { IReport } from '../../store/slices/adminSlice';

export const AdminOverview: React.FC = () => {
  const dispatch = useDispatch();
  const { analytics, users, reports, isLoading, error } = useSelector((state: RootState) => state.admin);

  const [adminTab, setAdminTab] = useState<'stats' | 'users' | 'reports'>('stats');
  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const loadAdminData = async () => {
    dispatch(adminStart());
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

      // 1. Fetch Analytics overview
      const statsRes = await fetch(`${apiHost}/api/admin/analytics`, { headers });
      const statsData = await statsRes.json();
      if (!statsRes.ok) throw new Error(statsData.message || 'Failed to fetch analytics metrics');
      dispatch(fetchAnalyticsSuccess(statsData));

      // 2. Fetch Users
      const usersRes = await fetch(`${apiHost}/api/admin/users?page=1&limit=50`, { headers });
      const usersData = await usersRes.json();
      if (!usersRes.ok) throw new Error(usersData.message || 'Failed to fetch users list');
      dispatch(
        fetchUsersSuccess({
          users: usersData.users,
          currentPage: usersData.currentPage,
          totalPages: usersData.totalPages,
        })
      );

      // 3. Fetch Reports
      const reportsRes = await fetch(`${apiHost}/api/admin/reports`, { headers });
      const reportsData = await reportsRes.json();
      if (!reportsRes.ok) throw new Error(reportsData.message || 'Failed to fetch abuse reports');
      dispatch(fetchReportsSuccess(reportsData));
    } catch (err: any) {
      dispatch(adminFailure(err.message || 'Failed to fetch admin data'));
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [dispatch]);

  const handleToggleBan = async (userId: string, isCurrentlyBanned: boolean) => {
    try {
      const res = await fetch(`${apiHost}/api/admin/users/${userId}/ban`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        dispatch(updateUserBanStatus({ userId, isBanned: !isCurrentlyBanned }));
        // Refresh stats
        const statsRes = await fetch(`${apiHost}/api/admin/analytics`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const statsData = await statsRes.json();
        dispatch(fetchAnalyticsSuccess(statsData));
      }
    } catch (err) {
      console.error('Ban operation error:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user account? This cannot be undone.')) return;
    try {
      const res = await fetch(`${apiHost}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        dispatch(removeUserSuccess(userId));
      }
    } catch (err) {
      console.error('Delete user admin error:', err);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      const res = await fetch(`${apiHost}/api/admin/reports/${reportId}/resolve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        dispatch(resolveReportSuccess(reportId));
      }
    } catch (err) {
      console.error('Resolve report error:', err);
    }
  };

  const handleDeleteOffendingContent = async (reportId: string) => {
    if (!confirm('Are you sure you want to wipe this offending content (message/group) from the database?')) return;
    try {
      const res = await fetch(`${apiHost}/api/admin/reports/${reportId}/content`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        dispatch(resolveReportSuccess(reportId));
        alert('Content deleted and report resolved successfully.');
      }
    } catch (err) {
      console.error('Delete offending content error:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-panel">
      {/* Header sub-tabs */}
      <div className="p-4 border-b border-neutral-900 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            PChatNow Control Center
          </h1>
          <button
            onClick={loadAdminData}
            className="px-2.5 py-1 text-xs bg-dark-input hover:bg-neutral-800 border border-neutral-800 font-bold rounded-lg text-white transition-all"
          >
            Refresh Metrics
          </button>
        </div>
        <div className="flex gap-2 border-b border-neutral-900 text-sm font-semibold">
          <button
            onClick={() => setAdminTab('stats')}
            className={`pb-3 px-2 border-b-2 transition-colors ${
              adminTab === 'stats'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-dark-secondary hover:text-white'
            }`}
          >
            Overview metrics
          </button>
          <button
            onClick={() => setAdminTab('users')}
            className={`pb-3 px-2 border-b-2 transition-colors ${
              adminTab === 'users'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-dark-secondary hover:text-white'
            }`}
          >
            Manage Users ({users.length})
          </button>
          <button
            onClick={() => setAdminTab('reports')}
            className={`pb-3 px-2 border-b-2 transition-colors relative ${
              adminTab === 'reports'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-dark-secondary hover:text-white'
            }`}
          >
            Abuse Reports
            {reports.filter((r) => r.status === 'pending').length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500 text-white rounded-full">
                {reports.filter((r) => r.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content scrollable panel */}
      <div className="flex-1 overflow-y-auto p-4 select-text">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {adminTab === 'stats' && analytics && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-dark-input/20 border border-neutral-900 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-dark-secondary uppercase tracking-wider block">Total Users</span>
                  <span className="text-xl font-bold text-white mt-1 block">{analytics.totalUsers}</span>
                </div>
              </div>

              <div className="p-4 bg-dark-input/20 border border-neutral-900 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute shrink-0" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-dark-secondary uppercase tracking-wider block">Online Now</span>
                  <span className="text-xl font-bold text-white mt-1 block">{analytics.onlineUsers}</span>
                </div>
              </div>

              <div className="p-4 bg-dark-input/20 border border-neutral-900 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-dark-secondary uppercase tracking-wider block">Total Messages</span>
                  <span className="text-xl font-bold text-white mt-1 block">{analytics.totalMessages}</span>
                </div>
              </div>

              <div className="p-4 bg-dark-input/20 border border-neutral-900 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-dark-secondary uppercase tracking-wider block">Abuse Reports</span>
                  <span className="text-xl font-bold text-white mt-1 block">{analytics.pendingReports}</span>
                </div>
              </div>
            </div>

            {/* Weekly Activity Box */}
            <div className="p-5 border border-neutral-900 bg-dark-input/10 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                Recent Activity Monitor (Last 7 Days)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-dark-input/20 rounded-xl">
                  <span className="text-xs text-dark-secondary">New Signups</span>
                  <div className="text-2xl font-bold text-white mt-1">{analytics.newUsersLastWeek}</div>
                </div>
                <div className="p-4 bg-dark-input/20 rounded-xl">
                  <span className="text-xs text-dark-secondary">Messages Sent</span>
                  <div className="text-2xl font-bold text-white mt-1">{analytics.newMessagesLastWeek}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {adminTab === 'users' && (
          <div className="space-y-3 animate-fade-in">
            {users.length > 0 ? (
              users.map((item: any) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-3.5 bg-dark-input/30 border border-neutral-900 rounded-xl hover:border-neutral-800 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      {item.avatar ? (
                        <img
                          src={item.avatar.startsWith('/') ? `${apiHost}${item.avatar}` : item.avatar}
                          alt={item.name}
                          className="w-11 h-11 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-neutral-800 flex items-center justify-center font-bold text-white uppercase text-sm">
                          {item.name.charAt(0)}
                        </div>
                      )}
                      {item.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-white flex items-center gap-1.5">
                        <span className="truncate">{item.name}</span>
                        {item.role === 'admin' && (
                          <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-[9px] font-bold rounded">
                            Admin
                          </span>
                        )}
                        {item.isBanned && (
                          <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[9px] font-bold rounded">
                            Banned
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-dark-secondary truncate mt-0.5">@{item.username}</div>
                    </div>
                  </div>

                  {/* Ban/Delete actions */}
                  {item.role !== 'admin' && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleBan(item._id, item.isBanned)}
                        className={`p-2 rounded-lg transition-colors border ${
                          item.isBanned
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950'
                            : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
                        }`}
                        title={item.isBanned ? 'Unban User' : 'Ban User'}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(item._id)}
                        className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                        title="Delete Account permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-sm text-dark-secondary">No users loaded in the directory</div>
            )}
          </div>
        )}

        {adminTab === 'reports' && (
          <div className="space-y-3 animate-fade-in">
            {reports.length > 0 ? (
              reports.map((report) => {
                const isPending = report.status === 'pending';
                return (
                  <div
                    key={report._id}
                    className="p-4 bg-dark-input/30 border border-neutral-900 rounded-xl space-y-3.5 text-xs text-slate-300 relative"
                  >
                    {/* Status Badge */}
                    <span
                      className={`absolute top-4 right-4 px-2 py-0.5 font-bold rounded text-[9px] uppercase tracking-wide ${
                        isPending ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {report.status}
                    </span>

                    {/* Report info */}
                    <div className="flex flex-col gap-1 pr-16">
                      <span className="font-bold text-white text-sm">
                        Report type: <span className="text-indigo-400 capitalize">{report.type}</span>
                      </span>
                      <span className="text-dark-secondary mt-0.5">
                        Reported by: @{report.reporter.username}
                      </span>
                    </div>

                    {/* Reason text */}
                    <div className="p-3 bg-neutral-900/40 rounded-lg border border-neutral-900 font-medium">
                      <span className="text-[9px] font-bold text-dark-secondary uppercase block mb-1">Reason</span>
                      <p className="text-white">{report.reason}</p>
                    </div>

                    {/* Offending contents preview */}
                    {report.type === 'message' && report.reportedMessage && (
                      <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                        <span className="text-[9px] font-bold text-red-400 uppercase block mb-1">
                          Reported Message Content (Sender: @{report.reportedMessage.sender.username})
                        </span>
                        <p className="text-white font-mono">{report.reportedMessage.content}</p>
                      </div>
                    )}

                    {report.type === 'group' && report.reportedGroup && (
                      <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/10 flex items-center gap-3">
                        <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center font-bold text-white uppercase shrink-0">
                          {report.reportedGroup.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-xs">{report.reportedGroup.name}</div>
                          <div className="text-[10px] text-dark-secondary mt-0.5">{report.reportedGroup.description}</div>
                        </div>
                      </div>
                    )}

                    {/* Action controls */}
                    {isPending && (
                      <div className="flex items-center gap-2 pt-1.5 select-none">
                        <button
                          onClick={() => handleResolveReport(report._id)}
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 font-bold rounded-lg flex items-center gap-1 transition-all border border-emerald-500/20"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Resolve Report
                        </button>
                        {report.type !== 'user' && (
                          <button
                            onClick={() => handleDeleteOffendingContent(report._id)}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 font-bold rounded-lg flex items-center gap-1 transition-all border border-red-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Offending Content
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-sm text-dark-secondary">No abuse reports in queue</div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
export default AdminOverview;
