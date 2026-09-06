import React, { useState, useEffect } from 'react';
import { senderApi, emailApi } from '../services/api';
import { Sender } from '../types';
import { X, Upload, CheckCircle, AlertCircle, Loader2, Calendar, Clock, Gauge } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientsText, setRecipientsText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [detectedEmailCount, setDetectedEmailCount] = useState<number>(0);
  const [startTime, setStartTime] = useState<string>(
    new Date(Date.now() + 60000).toISOString().slice(0, 16)
  );
  const [delayBetweenEmails, setDelayBetweenEmails] = useState<number>(2000);
  const [hourlyLimit, setHourlyLimit] = useState<number>(200);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSenders();
    }
  }, [isOpen]);

  const fetchSenders = async () => {
    try {
      const res = await senderApi.getSenders();
      if (res.data.success) {
        setSenders(res.data.data);
        if (res.data.data.length > 0) {
          const defaultSender = res.data.data.find((s: Sender) => s.isDefault) || res.data.data[0];
          setSelectedSenderId(defaultSender.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch senders', err);
    }
  };

  // Recipient email counter calculation
  useEffect(() => {
    if (uploadedFile) return; // Handled by server or file parse
    const matches = recipientsText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const unique = new Set(matches.map((e) => e.toLowerCase()));
    setDetectedEmailCount(unique.size);
  }, [recipientsText, uploadedFile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setError(null);
    try {
      const res = await emailApi.parseFile(file);
      if (res.data.success) {
        setDetectedEmailCount(res.data.count);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to parse recipients file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!subject.trim()) {
      setError('Subject line is required');
      return;
    }
    if (!body.trim()) {
      setError('Email body is required');
      return;
    }
    if (detectedEmailCount === 0) {
      setError('At least one valid recipient email is required');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      if (selectedSenderId) formData.append('senderId', selectedSenderId);
      formData.append('subject', subject);
      formData.append('body', body);
      formData.append('startTime', new Date(startTime).toISOString());
      formData.append('delayBetweenEmails', delayBetweenEmails.toString());
      formData.append('hourlyLimit', hourlyLimit.toString());

      if (uploadedFile) {
        formData.append('file', uploadedFile);
      } else {
        formData.append('recipientEmails', recipientsText);
      }

      const res = await emailApi.schedule(formData);
      if (res.data.success) {
        setSuccessMsg(`Successfully scheduled ${res.data.scheduledCount} email(s)!`);
        setTimeout(() => {
          onSuccess();
          onClose();
          // Reset form
          setSubject('');
          setBody('');
          setRecipientsText('');
          setUploadedFile(null);
          setSuccessMsg(null);
        }, 1200);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error scheduling emails');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">✉️</span>
            <h2 className="text-lg font-bold text-white">Compose & Schedule Campaign</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Sender & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Select Sender
              </label>
              <select
                value={selectedSenderId}
                onChange={(e) => setSelectedSenderId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email}) {s.isDefault ? '— Default' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Subject <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Product Update / Newsletter Announcement"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
              />
            </div>
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email Content (Body) <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi there, thanks for subscribing to our platform..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
            />
          </div>

          {/* Recipient File Upload / Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Recipients (Upload CSV / TXT or enter emails)
              </label>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {detectedEmailCount} valid email(s) detected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div>
                <textarea
                  rows={3}
                  disabled={!!uploadedFile}
                  value={recipientsText}
                  onChange={(e) => setRecipientsText(e.target.value)}
                  placeholder="Paste comma/newline separated recipient emails (e.g. user1@test.com, user2@test.com)"
                  className="w-full h-full min-h-[90px] px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500 placeholder-slate-500 disabled:opacity-50"
                />
              </div>

              {/* File Upload Box */}
              <div className="relative border-2 border-dashed border-slate-700 hover:border-blue-500/50 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-800/40 transition-colors">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-6 h-6 text-slate-400 mb-1" />
                {uploadedFile ? (
                  <div className="text-xs text-blue-400 font-semibold truncate max-w-[200px]">
                    📄 {uploadedFile.name}
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-slate-300">Upload CSV / TXT File</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Drag & drop or click to browse</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Timing & Limits Setup */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Min Delay (ms)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={delayBetweenEmails}
                onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" /> Hourly Limit / Sender
              </label>
              <input
                type="number"
                min="1"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 200)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                'Schedule Campaign'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
