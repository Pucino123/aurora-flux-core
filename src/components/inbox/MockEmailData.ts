export interface Email {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  threadId: string;
  labels: string[];
}

export const MOCK_EMAILS: Email[] = [
  {
    id: "e1",
    from: "Sarah Chen",
    fromEmail: "sarah@company.com",
    subject: "Q1 Planning Meeting Notes",
    preview: "Hey! Here are the notes from today's planning session. Key takeaways...",
    body: "Hey!\n\nHere are the notes from today's planning session.\n\nKey takeaways:\n1. Revenue target: 2.5M\n2. New product launch in March\n3. Hiring 3 new engineers\n\nLet me know if I missed anything.\n\nBest,\nSarah",
    date: "2026-02-15T10:30:00Z",
    isRead: false,
    isStarred: true,
    threadId: "t1",
    labels: ["work"],
  },
  {
    id: "e2",
    from: "GitHub",
    fromEmail: "noreply@github.com",
    subject: "[flux-app] New pull request #142",
    preview: "A new pull request has been opened by @devuser: 'feat: add dark mode support'",
    body: "A new pull request has been opened:\n\n#142 feat: add dark mode support\nby @devuser\n\nChanges:\n- Added dark mode toggle\n- Updated theme tokens\n- 15 files changed\n\nReview requested.",
    date: "2026-02-15T09:15:00Z",
    isRead: false,
    isStarred: false,
    threadId: "t2",
    labels: ["github"],
  },
  {
    id: "e3",
    from: "Alex Rodriguez",
    fromEmail: "alex.r@startup.io",
    subject: "Re: Partnership Proposal",
    preview: "Thanks for the detailed proposal. We've reviewed it internally and...",
    body: "Thanks for the detailed proposal. We've reviewed it internally and we're very interested in moving forward.\n\nCould we schedule a call this week to discuss the terms?\n\nBest regards,\nAlex",
    date: "2026-02-14T16:45:00Z",
    isRead: true,
    isStarred: false,
    threadId: "t3",
    labels: ["work"],
  },
  {
    id: "e4",
    from: "Notion",
    fromEmail: "team@notion.so",
    subject: "Your weekly workspace digest",
    preview: "Here's what happened in your workspace this week: 12 pages edited...",
    body: "Here's what happened in your workspace this week:\n\n📝 12 pages edited\n👥 3 new comments\n✅ 8 tasks completed\n\nKeep up the great work!",
    date: "2026-02-14T08:00:00Z",
    isRead: true,
    isStarred: false,
    threadId: "t4",
    labels: ["notifications"],
  },
  {
    id: "e5",
    from: "Maya Johnson",
    fromEmail: "maya@design.co",
    subject: "Design Review Feedback",
    preview: "I've gone through the latest mockups and have some thoughts on the navigation...",
    body: "I've gone through the latest mockups and have some thoughts on the navigation flow.\n\nOverall it looks great! A few suggestions:\n- The sidebar could use more contrast\n- Consider adding breadcrumbs\n- The mobile menu needs work\n\nI'll share annotated screenshots tomorrow.\n\nCheers,\nMaya",
    date: "2026-02-13T14:20:00Z",
    isRead: true,
    isStarred: true,
    threadId: "t5",
    labels: ["design"],
  },
];
