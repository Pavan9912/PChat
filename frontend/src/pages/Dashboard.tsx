import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ArrowLeft } from 'lucide-react';
import { RootState } from '../store';
import { setActiveChat } from '../store/slices/chatSlice';
import { SidebarTabs } from '../components/chat/SidebarTabs';
import { ChatsTab } from '../components/dashboard/ChatsTab';
import { StatusTab } from '../components/dashboard/StatusTab';
import { FriendsTab } from '../components/dashboard/FriendsTab';
import { GroupsTab } from '../components/dashboard/GroupsTab';
import { NotificationsTab } from '../components/dashboard/NotificationsTab';
import { SettingsTab } from '../components/dashboard/SettingsTab';
import { AdminOverview } from '../components/admin/AdminOverview';
import { ChatArea } from '../components/chat/ChatArea';
import { RightSidebar } from '../components/chat/RightSidebar';
import { CallScreen } from '../components/calling/CallScreen';

export const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const { activeChat } = useSelector((state: RootState) => state.chat);

  const [activeTab, setActiveTab] = useState('chats');
  const [showRightSidebar, setShowRightSidebar] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans antialiased">
      
      {/* Voice/Video WebRTC calling overlay */}
      <CallScreen />

      {/* 1. Left Sidebar Navigation Columns */}
      <div 
        className={`flex h-full shrink-0 z-20 ${
          activeChat ? 'hidden md:flex' : 'flex w-full md:w-auto'
        }`}
      >
        <SidebarTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* Active Tab Panel viewer */}
        <div className="w-full md:w-80 border-r border-neutral-900 h-full">
          {activeTab === 'chats' && <ChatsTab />}
          {activeTab === 'status' && <StatusTab />}
          {activeTab === 'friends' && <FriendsTab setActiveTab={setActiveTab} />}
          {activeTab === 'groups' && <GroupsTab setActiveTab={setActiveTab} />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'settings' && <SettingsTab />}
          {activeTab === 'admin' && <AdminOverview />}
        </div>
      </div>

      {/* 2. Center Panel Area (Chat Feed) */}
      <div 
        className={`flex-1 h-full flex flex-col relative min-w-0 ${
          !activeChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Mobile Header bar back trigger */}
        {activeChat && (
          <div className="md:hidden h-14 bg-slate-950 border-b border-neutral-900 px-3 flex items-center shrink-0 z-30 select-none">
            <button
              onClick={() => dispatch(setActiveChat(null))}
              className="p-1.5 hover:bg-neutral-900 rounded-lg text-dark-secondary hover:text-white transition-colors flex items-center gap-1 text-xs font-bold"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </div>
        )}

        <ChatArea onToggleRightSidebar={() => setShowRightSidebar(!showRightSidebar)} />
      </div>

      {/* 3. Right Sidebar details (Collapsible) */}
      {showRightSidebar && activeChat && (
        <div 
          className={`h-full shrink-0 z-30 md:static absolute inset-y-0 right-0 ${
            showRightSidebar ? 'flex' : 'hidden'
          }`}
        >
          {/* Mobile Overlay backdrop */}
          <div 
            onClick={() => setShowRightSidebar(false)} 
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-[-1]"
          />
          <RightSidebar onClose={() => setShowRightSidebar(false)} />
        </div>
      )}

    </div>
  );
};
export default Dashboard;
