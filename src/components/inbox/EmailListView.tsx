import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Star, ArrowLeft, Reply, Forward, Trash2, Search, MailPlus } from "lucide-react";
import { MOCK_EMAILS, type Email } from "./MockEmailData";

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
};

const EmailListView = () => {
  const [emails, setEmails] = useState(MOCK_EMAILS);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmails = emails.filter(
    (e) =>
      e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.from.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const markAsRead = (id: string) => {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, isRead: true } : e)));
  };

  const toggleStar = (id: string) => {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, isStarred: !e.isStarred } : e)));
  };

  const deleteEmail = (id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id));
    if (selectedEmail?.id === id) setSelectedEmail(null);
  };

  const openEmail = (email: Email) => {
    markAsRead(email.id);
    setSelectedEmail(email);
  };

  const unreadCount = emails.filter((e) => !e.isRead).length;

  if (selectedEmail) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="h-full flex flex-col"
      >
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setSelectedEmail(null)}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <h3 className="text-sm font-semibold flex-1 truncate">{selectedEmail.subject}</h3>
          <button
            onClick={() => toggleStar(selectedEmail.id)}
            className={`p-1.5 rounded-lg transition-colors ${selectedEmail.isStarred ? "text-yellow-500" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Star size={14} className={selectedEmail.isStarred ? "fill-current" : ""} />
          </button>
          <button
            onClick={() => deleteEmail(selectedEmail.id)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {selectedEmail.from[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{selectedEmail.from}</p>
            <p className="text-[11px] text-muted-foreground truncate">{selectedEmail.fromEmail}</p>
          </div>
          <span className="text-[10px] text-muted-foreground">{timeAgo(selectedEmail.date)}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{selectedEmail.body}</p>
        </div>

        <div className="flex gap-2 pt-3 mt-3 border-t border-border">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground font-medium">
            <Reply size={12} /> Reply
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-secondary text-secondary-foreground font-medium">
            <Forward size={12} /> Forward
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search emails..."
          className="w-full pl-8 pr-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      {/* Connect prompt */}
      <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
        <MailPlus size={14} className="text-primary shrink-0" />
        <p className="text-[11px] text-muted-foreground flex-1">Connect Gmail or Outlook to sync real emails</p>
        <button className="text-[10px] font-semibold text-primary hover:underline">Connect</button>
      </div>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <p className="text-[10px] text-muted-foreground mb-2">{unreadCount} unread</p>
      )}

      {/* Email list */}
      <div className="flex-1 overflow-y-auto space-y-1">
        <AnimatePresence>
          {filteredEmails.map((email, i) => (
            <motion.button
              key={email.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => openEmail(email)}
              className={`w-full text-left p-2.5 rounded-lg transition-all group ${
                !email.isRead
                  ? "bg-primary/5 border border-primary/10 hover:bg-primary/10"
                  : "hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground shrink-0 mt-0.5">
                  {email.from[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs truncate ${!email.isRead ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {email.from}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(email.date)}</span>
                  </div>
                  <p className={`text-[11px] truncate ${!email.isRead ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                    {email.subject}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{email.preview}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleStar(email.id); }}
                  className={`p-0.5 shrink-0 mt-1 ${email.isStarred ? "text-yellow-500" : "opacity-0 group-hover:opacity-100 text-muted-foreground"} transition-all`}
                >
                  <Star size={11} className={email.isStarred ? "fill-current" : ""} />
                </button>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        {filteredEmails.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Mail size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">No emails found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailListView;
