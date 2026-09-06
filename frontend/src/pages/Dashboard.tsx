import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { ScheduledTable } from '../components/ScheduledTable';
import { SentTable } from '../components/SentTable';
import { ComposeModal } from '../components/ComposeModal';
import { emailApi } from '../services/api';
import { EmailJob } from '../types';
import { Plus, Clock, CheckCircle2, Search } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledJobs, setScheduledJobs] = useState<EmailJob[]>([]);
  const [sentJobs, setSentJobs] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const fetchEmailJobs = useCallback(async () => {
    setLoading(true);
    try {
      if (searchQuery.trim()) {
        const res = await emailApi.search(searchQuery);
        if (res.data.success) {
          const allHits: EmailJob[] = res.data.data;
          setScheduledJobs(
            allHits.filter(
              (j) => j.status === 'scheduled' || j.status === 'processing' || j.status === 'rate_limited'
            )
          );
          setSentJobs(allHits.filter((j) => j.status === 'sent' || j.status === 'failed'));
        }
      } else {
        const [schedRes, sentRes] = await Promise.all([
          emailApi.getScheduled(),
          emailApi.getSent()
        ]);
        if (schedRes.data.success) setScheduledJobs(schedRes.data.data);
        if (sentRes.data.success) setSentJobs(sentRes.data.data);
      }
    } catch (err) {
      console.error('Error loading email jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchEmailJobs();
    // Auto polling every 5 seconds for live status updates
    const interval = setInterval(fetchEmailJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchEmailJobs]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Dashboard Top Banner Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Campaign Dispatcher</h2>
            <p className="text-xs text-slate-400 mt-1">
              Manage scheduled email queues, inspect sent analytics, and dispatch new email campaigns.
            </p>
          </div>

          <button
            onClick={() => setIsComposeOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Compose New Email</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'scheduled'
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Scheduled Emails</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {scheduledJobs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sent')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'sent'
                ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sent Emails</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {sentJobs.length}
            </span>
          </button>
        </div>

        {/* Table View Component */}
        {activeTab === 'scheduled' ? (
          <ScheduledTable
            jobs={scheduledJobs}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={fetchEmailJobs}
          />
        ) : (
          <SentTable
            jobs={sentJobs}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={fetchEmailJobs}
          />
        )}
      </main>

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={fetchEmailJobs}
      />
    </div>
  );
};
