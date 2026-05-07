"use client";

import { usePathname } from "next/navigation";

type Props = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
};

export function MessagesShell({ sidebar, children }: Props) {
  const pathname = usePathname();
  const hasConversation = pathname !== "/messages";

  return (
    <div className="flex h-[calc(100dvh-80px)] md:h-[calc(100dvh-65px)]">
      {/* Sidebar — hidden on mobile when a conversation is open */}
      <div
        className={[
          "w-full shrink-0 border-r border-[rgba(212,175,55,0.1)] md:w-80",
          hasConversation ? "hidden md:flex md:flex-col" : "flex flex-col",
        ].join(" ")}
      >
        {sidebar}
      </div>

      {/* Main chat area — hidden on mobile when no conversation selected */}
      <div
        className={[
          "flex-1 flex-col",
          hasConversation ? "flex" : "hidden md:flex",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
