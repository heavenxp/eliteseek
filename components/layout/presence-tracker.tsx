"use client";

import { useEffect } from "react";
import { updateLastSeen } from "@/app/actions/presence";

export function PresenceTracker() {
  useEffect(() => {
    updateLastSeen().catch(() => {});
  }, []);

  return null;
}
