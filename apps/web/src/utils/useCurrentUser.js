"use client";

import { useState, useEffect, useCallback } from "react";

export function useCurrentUser() {
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("labs_user_id");
    if (stored) {
      setUserId(stored);
      fetch(`/api/users/profile?id=${stored}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.profile) setProfile(data.profile);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const saveProfile = useCallback(
    async ({ nickname, avatar }) => {
      // If we already have an id, pass it (upsert existing session)
      // If not, let backend find-or-create by nickname (works across devices)
      const body = userId
        ? { id: userId, nickname, avatar }
        : { nickname, avatar };

      const res = await fetch("/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setUserId(data.profile.id);
        localStorage.setItem("labs_user_id", data.profile.id);
      }
      return data;
    },
    [userId],
  );

  const clearProfile = useCallback(() => {
    localStorage.removeItem("labs_user_id");
    setUserId(null);
    setProfile(null);
  }, []);

  return {
    userId,
    profile,
    loading,
    saveProfile,
    clearProfile,
    isSetup: Boolean(profile),
  };
}
