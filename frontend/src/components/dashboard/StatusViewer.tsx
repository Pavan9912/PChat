import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { X, Play, Pause, ChevronLeft, ChevronRight, Type, Palette, Send, Eye, Image } from 'lucide-react';
import { RootState } from '../../store';
import { IStatus } from './StatusTab';

interface StatusViewerProps {
  isViewerOpen: boolean;
  onCloseViewer: () => void;
  activeStoryGroup: { user: any; statuses: IStatus[] } | null;
  creatorMode: 'text' | 'media' | null;
  onCloseCreator: () => void;
}

const GRADIENTS = [
  'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', // Slate
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple-blue
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', // Emerald-teal
  'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)', // Coral-red
  'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)', // Neon-blue
];

export const StatusViewer: React.FC<StatusViewerProps> = ({
  isViewerOpen,
  onCloseViewer,
  activeStoryGroup,
  creatorMode,
  onCloseCreator,
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // ----------------------------------------------------
  // STORY PLAYER STATE & LOGIC
  // ----------------------------------------------------
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressTimerRef = useRef<number | null>(null);

  const activeStatuses = activeStoryGroup?.statuses || [];
  const currentStatus = activeStatuses[currentIdx];

  // Reset indices on opening a new story
  useEffect(() => {
    if (isViewerOpen) {
      setCurrentIdx(0);
      setProgress(0);
      setIsPaused(false);
    }
  }, [isViewerOpen, activeStoryGroup]);

  // Mark status as viewed in database
  const markStatusViewed = async (statusId: string) => {
    try {
      await fetch(`${apiHost}/api/status/${statusId}/view`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
    } catch (err) {
      console.error('Failed to mark status viewed:', err);
    }
  };

  // Trigger viewed request when active status loads
  useEffect(() => {
    if (isViewerOpen && currentStatus && !currentStatus.views.includes(user?._id || '')) {
      markStatusViewed(currentStatus._id);
    }
  }, [currentIdx, isViewerOpen, activeStoryGroup]);

  // Stories progress timer
  useEffect(() => {
    if (!isViewerOpen || !currentStatus || isPaused) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }

    const duration = 5000; // 5s per story
    const step = 50; // update every 50ms
    const totalSteps = duration / step;

    progressTimerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Go to next story
          if (currentIdx < activeStatuses.length - 1) {
            setCurrentIdx((idx) => idx + 1);
            return 0;
          } else {
            // End of story list
            onCloseViewer();
            return 100;
          }
        }
        return prev + (100 / totalSteps);
      });
    }, step);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isViewerOpen, currentIdx, isPaused, activeStatuses]);

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((idx) => idx - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  const handleNext = () => {
    if (currentIdx < activeStatuses.length - 1) {
      setCurrentIdx((idx) => idx + 1);
      setProgress(0);
    } else {
      onCloseViewer();
    }
  };

  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  // ----------------------------------------------------
  // STATUS CREATION STATE & LOGIC
  // ----------------------------------------------------
  const [textStatusContent, setTextStatusContent] = useState('');
  const [gradientIdx, setGradientIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [mediaCaption, setMediaCaption] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const submitTextStatus = async () => {
    if (!textStatusContent.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${apiHost}/api/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          type: 'text',
          content: textStatusContent,
          backgroundColor: GRADIENTS[gradientIdx],
        }),
      });

      if (res.ok) {
        setTextStatusContent('');
        onCloseCreator();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to submit status update');
      }
    } catch (error) {
      console.error(error);
      alert('Error creating status update');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitMediaStatus = async () => {
    if (!selectedFile) return;
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (mediaCaption.trim()) {
      formData.append('content', mediaCaption);
    }

    try {
      const res = await fetch(`${apiHost}/api/status`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (res.ok) {
        setSelectedFile(null);
        setFilePreview('');
        setMediaCaption('');
        onCloseCreator();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to upload status update');
      }
    } catch (error) {
      console.error(error);
      alert('Error creating status update');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Story Viewer Overlay
  if (isViewerOpen && activeStoryGroup) {
    if (!currentStatus) return null;

    const isMyStory = activeStoryGroup.user._id === user?._id;

    return (
      <div className="fixed inset-0 z-[1000] flex flex-col bg-black text-white p-4 font-sans select-none">
        
        {/* Progress indicators wrapper */}
        <div className="flex gap-1.5 w-full max-w-xl mx-auto mt-2 mb-4 shrink-0">
          {activeStatuses.map((s, idx) => {
            let width = '0%';
            if (idx < currentIdx) width = '100%';
            if (idx === currentIdx) width = `${progress}%`;

            return (
              <div key={s._id} className="flex-1 h-1 bg-neutral-700/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-75"
                  style={{ width }}
                />
              </div>
            );
          })}
        </div>

        {/* Story details header */}
        <div className="flex items-center justify-between w-full max-w-xl mx-auto mb-4 shrink-0">
          <div className="flex items-center gap-3">
            {activeStoryGroup.user.avatar ? (
              <img
                src={activeStoryGroup.user.avatar.startsWith('/') ? `${apiHost}${activeStoryGroup.user.avatar}` : activeStoryGroup.user.avatar}
                alt={activeStoryGroup.user.name}
                className="w-10 h-10 rounded-xl object-cover border border-neutral-800"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-neutral-850 flex items-center justify-center font-bold text-white uppercase text-sm">
                {activeStoryGroup.user.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="font-semibold text-sm">{activeStoryGroup.user.name}</div>
              <div className="text-[10px] text-dark-secondary mt-0.5">
                {new Date(currentStatus.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 hover:bg-neutral-900 rounded-xl transition-colors"
            >
              {isPaused ? <Play className="w-5 h-5 text-emerald-400 fill-emerald-400" /> : <Pause className="w-5 h-5 text-slate-300" />}
            </button>
            <button
              onClick={onCloseViewer}
              className="p-2 hover:bg-neutral-900 rounded-xl transition-colors text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main story canvas content */}
        <div
          onClick={handleScreenClick}
          className="flex-1 w-full max-w-xl mx-auto rounded-3xl overflow-hidden border border-neutral-900 flex items-center justify-center shadow-2xl relative cursor-pointer"
          style={{
            background: currentStatus.type === 'text' ? currentStatus.backgroundColor || '#0f172a' : 'transparent',
          }}
        >
          {currentStatus.type === 'text' && (
            <p className="px-8 text-center text-xl font-bold leading-relaxed whitespace-pre-wrap max-w-sm">
              {currentStatus.content}
            </p>
          )}

          {currentStatus.type === 'image' && currentStatus.mediaUrl && (
            <img
              src={currentStatus.mediaUrl.startsWith('/') ? `${apiHost}${currentStatus.mediaUrl}` : currentStatus.mediaUrl}
              alt="Status image content"
              className="w-full h-full object-contain pointer-events-none"
            />
          )}

          {currentStatus.type === 'video' && currentStatus.mediaUrl && (
            <video
              src={currentStatus.mediaUrl.startsWith('/') ? `${apiHost}${currentStatus.mediaUrl}` : currentStatus.mediaUrl}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain pointer-events-none"
            />
          )}

          {/* Text/caption banner on bottom */}
          {currentStatus.type !== 'text' && currentStatus.content && (
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-slate-950/80 backdrop-blur-sm border border-neutral-850 text-center text-sm font-semibold select-text">
              {currentStatus.content}
            </div>
          )}
        </div>

        {/* View list stats counts for own stories */}
        {isMyStory && (
          <div className="w-full max-w-xl mx-auto flex items-center justify-center gap-1.5 py-4 text-xs text-dark-secondary shrink-0 select-text">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>{currentStatus.views.length} view{currentStatus.views.length !== 1 ? 's' : ''}</span>
          </div>
        )}

      </div>
    );
  }

  // Render Status Text Creator Modal Dialog
  if (creatorMode === 'text') {
    return (
      <div className="fixed inset-0 z-[1000] flex flex-col bg-slate-950/95 backdrop-blur-md text-white p-6 font-sans">
        <div className="flex items-center justify-between w-full max-w-xl mx-auto mt-2 mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Type className="w-5 h-5 text-emerald-400" />
            Create Text Status
          </h3>
          <button
            onClick={onCloseCreator}
            className="p-2 hover:bg-neutral-900 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className="flex-1 w-full max-w-xl mx-auto rounded-3xl border border-neutral-850 flex items-center justify-center relative shadow-2xl p-6 mb-6"
          style={{ background: GRADIENTS[gradientIdx] }}
        >
          <textarea
            value={textStatusContent}
            onChange={(e) => setTextStatusContent(e.target.value)}
            placeholder="Type a status update..."
            maxLength={180}
            rows={4}
            className="w-full bg-transparent text-center text-xl font-bold leading-relaxed text-white placeholder-white/50 focus:outline-none resize-none px-4"
            autoFocus
          />
          <span className="absolute bottom-4 right-4 text-[10px] text-white/50 font-bold">
            {180 - textStatusContent.length} characters left
          </span>
        </div>

        <div className="w-full max-w-xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => setGradientIdx((prev) => (prev + 1) % GRADIENTS.length)}
            title="Toggle background color"
            className="p-3 bg-neutral-900 border border-neutral-850 hover:bg-neutral-850 text-emerald-400 rounded-2xl hover:scale-105 transition-all shadow-lg"
          >
            <Palette className="w-5 h-5" />
          </button>

          <button
            onClick={submitTextStatus}
            disabled={isSubmitting || !textStatusContent.trim()}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/30 disabled:text-slate-950/50 text-slate-950 font-bold rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-500/10 hover:scale-105 disabled:scale-100 transition-all"
          >
            {isSubmitting ? 'Publishing...' : 'Publish Status'}
            <Send className="w-4 h-4 fill-slate-950" />
          </button>
        </div>
      </div>
    );
  }

  // Render Status Media Creator Modal Dialog
  if (creatorMode === 'media') {
    return (
      <div className="fixed inset-0 z-[1000] flex flex-col bg-slate-950/95 backdrop-blur-md text-white p-6 font-sans">
        <div className="flex items-center justify-between w-full max-w-xl mx-auto mt-2 mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Image className="w-5 h-5 text-emerald-400" />
            Upload Media Status
          </h3>
          <button
            onClick={() => {
              setSelectedFile(null);
              setFilePreview('');
              onCloseCreator();
            }}
            className="p-2 hover:bg-neutral-900 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 w-full max-w-xl mx-auto rounded-3xl border border-neutral-850 bg-neutral-900/40 flex flex-col items-center justify-center relative shadow-2xl overflow-hidden mb-6 p-4">
          {filePreview ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              {selectedFile?.type.startsWith('video') ? (
                <video src={filePreview} controls className="max-h-72 max-w-full rounded-2xl" />
              ) : (
                <img src={filePreview} alt="Selected Status Preview" className="max-h-72 max-w-full rounded-2xl object-contain" />
              )}
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setFilePreview('');
                }}
                className="mt-3 text-xs font-bold text-red-400 hover:text-red-300 hover:underline"
              >
                Choose another file
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center cursor-pointer p-8 text-center text-dark-secondary hover:text-white transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/25 mb-4">
                <Image className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold">Drag & Drop or Click to Select File</p>
              <p className="text-[10px] mt-1">Supports Images and Videos up to 50MB</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Caption & Submit row */}
        {filePreview && (
          <div className="w-full max-w-xl mx-auto space-y-4">
            <input
              type="text"
              value={mediaCaption}
              onChange={(e) => setMediaCaption(e.target.value)}
              placeholder="Add status caption (optional)..."
              maxLength={100}
              className="w-full px-4 py-3 bg-dark-input text-sm text-white border border-neutral-850 rounded-2xl focus:outline-none focus:border-dark-accent transition-colors"
            />
            
            <div className="flex justify-end">
              <button
                onClick={submitMediaStatus}
                disabled={isSubmitting}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/30 disabled:text-slate-950/50 text-slate-950 font-bold rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-500/10 hover:scale-105 disabled:scale-100 transition-all"
              >
                {isSubmitting ? 'Uploading...' : 'Upload Status'}
                <Send className="w-4 h-4 fill-slate-950" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};
export default StatusViewer;
