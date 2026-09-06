import React from 'react';
import { EmailJob } from '../types';
import { StatusBadge } from './StatusBadge';
import { CheckCircle2, Search, RefreshCw, Inbox, AlertCircle } from 'lucide-react';

interface SentTableProps {
  jobs: EmailJob[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
}

export const SentTable: React.FC<SentTableProps> = ({
  jobs,
  loading,
  searchQuery,
  onSearchChange,
  onRefresh
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Table Toolbar */}
      <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Sent & Processed Emails
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            History of successfully dispatched emails and failed delivery attempts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search sent recipient, subject..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={onRefresh}
            title="Refresh Table"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Contents */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-6">Recipient Email</th>
              <th className="py-3.5 px-6">Subject</th>
              <th className="py-3.5 px-6">Sent Time</th>
              <th className="py-3.5 px-6">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-500">
                  <div className="inline-flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Loading sent history...</span>
                  </div>
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 text-slate-600" />
                    <p className="font-medium text-slate-400">No sent email logs found</p>
                    <p className="text-[11px] text-slate-600">Dispatched emails will appear here once processed.</p>
                  </div>
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-4 px-6 font-medium text-slate-100">{job.recipientEmail}</td>
                  <td className="py-4 px-6 max-w-xs truncate">{job.subject}</td>
                  <td className="py-4 px-6 text-slate-400">
                    {job.sentAt ? new Date(job.sentAt).toLocaleString() : 'N/A'}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={job.status} />
                      {job.errorMessage && (
                        <span
                          title={job.errorMessage}
                          className="text-rose-400 hover:underline cursor-pointer text-[11px] flex items-center gap-1"
                        >
                          <AlertCircle className="w-3.5 h-3.5" /> Error
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
