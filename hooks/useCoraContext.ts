import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/mcp-supabase";

interface ConnectionContext {
  activeMatches?: Array<{
    name: string;
    age?: number;
    sharedInterests?: string[];
    conversationHooks?: string[];
    matchScore?: string;
    matchReasons?: any;
  }>;
  activeConversations?: Array<{ name: string; age?: number; city?: string }>;
  passedMatches?: Array<{
    name: string;
    reason?: string;
    matchReasons?: any;
    matchScore?: string;
  }>;
  optedInMatches?: Array<{
    name: string;
    status: string;
    matchReasons?: any;
  }>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useCoraContext(userId: string | null) {
  const [context, setContext] = useState<ConnectionContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{
    context: ConnectionContext | null;
    timestamp: number;
  }>({ context: null, timestamp: 0 });

  const fetchContext = useCallback(async (force = false) => {
    if (!userId) return;

    const now = Date.now();
    const cacheAge = now - cacheRef.current.timestamp;

    // Use cache if it's fresh and not forcing refresh
    if (!force && cacheRef.current.context && cacheAge < CACHE_DURATION) {
      setContext(cacheRef.current.context);
      return cacheRef.current.context;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all matches (active, opted-in, and passed)
      const [matchesResult, conversationsResult, optInsResult] = await Promise.all([
        supabase
          .from('match_candidates')
          .select('*')
          .or(`user_a.eq.${userId},user_b.eq.${userId}`)
          .in('status', ['active', 'opted_in_a', 'opted_in_b', 'mutual_opt_in', 'passed'])
          .gt('expires_at', new Date().toISOString()),
        supabase
          .from('conversations')
          .select('*')
          .or(`user_a.eq.${userId},user_b.eq.${userId}`)
          .eq('conversation_type', 'match')
          .eq('status', 'active'),
        supabase
          .from('opt_ins')
          .select('*')
          .eq('user_id', userId),
      ]);

      const matchesData = matchesResult.data || [];
      const conversationsData = conversationsResult.data || [];
      const optInsData = optInsResult.data || [];

      // Get match IDs from opt_ins to fetch their data
      const optInMatchIds = optInsData.map(optIn => optIn.match_id);
      let additionalMatchesData: any[] = [];
      if (optInMatchIds.length > 0) {
        const { data: additionalMatches } = await supabase
          .from('match_candidates')
          .select('*')
          .in('id', optInMatchIds);
        additionalMatchesData = additionalMatches || [];
      }

      // Combine all matches
      const allMatchesData = [...matchesData, ...additionalMatchesData];
      const uniqueMatchesMap = new Map();
      allMatchesData.forEach((match: any) => {
        if (!uniqueMatchesMap.has(match.id)) {
          uniqueMatchesMap.set(match.id, match);
        }
      });
      const allMatches = Array.from(uniqueMatchesMap.values());

      // Get all unique user IDs
      const userIds = new Set<string>();
      allMatches.forEach((match: any) => {
        userIds.add(match.user_a);
        userIds.add(match.user_b);
      });
      conversationsData.forEach((conv: any) => {
        userIds.add(conv.user_a);
        userIds.add(conv.user_b);
      });

      // Fetch all profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, birthdate, city')
        .in('id', Array.from(userIds));

      const profilesMap = new Map();
      profilesData?.forEach((profile: any) => {
        profilesMap.set(profile.id, profile);
      });

      // Process matches
      const activeMatches: Array<{
        name: string;
        age?: number;
        sharedInterests?: string[];
        conversationHooks?: string[];
        matchScore?: string;
        matchReasons?: any;
      }> = [];
      const optedInMatches: Array<{ name: string; status: string; matchReasons?: any }> = [];
      const passedMatches: Array<{ name: string; reason?: string; matchReasons?: any; matchScore?: string }> = [];

      allMatches.forEach((match: any) => {
        const isUserA = match.user_a === userId;
        const otherUserId = isUserA ? match.user_b : match.user_a;
        const otherUser = profilesMap.get(otherUserId);
        if (!otherUser) return;

        const name = (otherUser.first_name || 'Unknown').trim();
        const sharedInterests = match.reasons?.shared_interests || [];
        const conversationHooks = match.reasons?.conversation_hooks || [];
        const matchScore = match.score;
        const age = otherUser.birthdate ? (() => {
          const d = new Date(otherUser.birthdate);
          if (isNaN(d.getTime())) return undefined;
          const today = new Date();
          let a = today.getFullYear() - d.getFullYear();
          const m = today.getMonth() - d.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
          return a >= 0 ? a : undefined;
        })() : undefined;

        if (match.status === 'active') {
          activeMatches.push({
            name,
            age,
            sharedInterests: sharedInterests,
            conversationHooks: conversationHooks,
            matchScore: matchScore,
            matchReasons: match.reasons
          });
        } else if (match.status === 'opted_in_a' || match.status === 'opted_in_b') {
          const userOptedIn = (isUserA && match.status === 'opted_in_a') || (!isUserA && match.status === 'opted_in_b');
          if (userOptedIn) {
            optedInMatches.push({
              name: name.trim(),
              status: match.status,
              matchReasons: match.reasons
            });
          }
        } else if (match.status === 'passed') {
          passedMatches.push({
            name: name.trim(),
            matchReasons: match.reasons,
            matchScore: matchScore
          });
        }
      });

      // Process opt-ins and passes
      if (optInsData && allMatches.length > 0) {
        const matchesMap = new Map();
        allMatches.forEach((match: any) => {
          matchesMap.set(match.id, match);
        });

        optInsData.forEach((optIn: any) => {
          const match = matchesMap.get(optIn.match_id);
          if (!match) return;

          const isUserA = match.user_a === userId;
          const otherUserId = isUserA ? match.user_b : match.user_a;
          const otherUser = profilesMap.get(otherUserId);
          if (!otherUser) return;

          const name = (otherUser.first_name || 'Unknown').trim();

          if (optIn.decision === 'opt_in') {
            if (match.status === 'mutual_opt_in') {
              optedInMatches.push({
                name: name.trim(),
                status: 'mutual_opt_in',
                matchReasons: match.reasons
              });
            }
          } else if (optIn.decision === 'pass') {
            passedMatches.push({
              name: name.trim(),
              matchReasons: match.reasons,
              matchScore: match.score
            });
          }
        });
      }

      // Process conversations
      const activeConversations: Array<{ name: string; age?: number; city?: string }> = [];
      conversationsData.forEach((conv: any) => {
        const isUserA = conv.user_a === userId;
        const otherUserId = isUserA ? conv.user_b : conv.user_a;
        const otherUser = profilesMap.get(otherUserId);
        if (!otherUser) return;
        const age = otherUser.birthdate ? (() => {
          const d = new Date(otherUser.birthdate);
          if (isNaN(d.getTime())) return undefined;
          const today = new Date();
          let a = today.getFullYear() - d.getFullYear();
          const m = today.getMonth() - d.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
          return a >= 0 ? a : undefined;
        })() : undefined;
        activeConversations.push({
          name: (otherUser.first_name || 'Unknown').trim(),
          age,
          city: otherUser.city
        });
      });

      const connectionContext: ConnectionContext = {
        activeMatches,
        activeConversations,
        optedInMatches,
        passedMatches
      };

      // Update cache
      cacheRef.current = {
        context: connectionContext,
        timestamp: now,
      };

      setContext(connectionContext);
      return connectionContext;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load connection context";
      setError(errorMessage);
      console.error("Error fetching Cora context:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchContext();
    }
  }, [userId, fetchContext]);

  const refreshContext = useCallback(() => {
    return fetchContext(true);
  }, [fetchContext]);

  return {
    context,
    loading,
    error,
    refreshContext,
  };
}
