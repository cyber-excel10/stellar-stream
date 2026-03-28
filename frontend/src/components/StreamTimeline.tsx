import { useCallback, useEffect, useMemo, useState } from "react";
import { getStreamHistory, listAllEvents, StreamEvent } from "../services/api";
import { CopyableAddress } from "./CopyableAddress";

interface StreamTimelineProps {
  streamId?: string;
}

/** Simple "time ago" formatter */
function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getEventIcon(eventType: string): string {
  switch (eventType) {
    case "created":
      return "CR";
    case "claimed":
      return "CL";
    case "canceled":
      return "CX";
    case "start_time_updated":
      return "ST";
    default:
      return "EV";
  }
}

function formatEventTitle(eventType: string): string {
  switch (eventType) {
    case "created":
      return "Stream created";
    case "claimed":
      return "Stream claimed";
    case "canceled":
      return "Stream canceled";
    case "start_time_updated":
      return "Start time updated";
    default:
      return "Stream event";
  }
}

function getEventDescription(event: StreamEvent): string {
  const actor = event.actor
    ? `${event.actor.slice(0, 6)}...${event.actor.slice(-4)}`
    : "Unknown";
  switch (event.eventType) {
    case "created":
      return `Initiated by ${actor} for ${event.amount ?? 0} tokens`;
    case "claimed":
      return `Claim of ${event.amount ?? 0} tokens processed by ${actor}`;
    case "canceled":
      return `Closed by ${actor}`;
    case "start_time_updated":
      return `New start time set by ${actor}`;
    default:
      return `Action performed by ${actor}`;
  }
}

export function StreamTimeline({ streamId }: StreamTimelineProps) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const isGlobalFeed = useMemo(() => !streamId, [streamId]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = streamId
        ? await getStreamHistory(streamId)
        : await listAllEvents();
      setEvents(data);
      setLastUpdatedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (loading) {
    return (
      <div className="activity-feed">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={`activity-skeleton-${idx}`} className="skeleton skeleton-item" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="activity-error">
        <h3>Unable to load activity</h3>
        <p>{error}</p>
        <button type="button" className="retry-btn" onClick={loadHistory}>
          Try again
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="activity-empty">
        <span className="activity-empty-icon" aria-hidden>
          --
        </span>
        <p>No activity to show yet.</p>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      {isGlobalFeed && (
        <div className="activity-meta" style={{ justifyContent: "space-between" }}>
          <span>
            Latest across all streams
            {lastUpdatedAt ? ` · updated ${timeAgo(Math.floor(lastUpdatedAt / 1000))}` : ""}
          </span>
          <button type="button" className="btn-ghost" onClick={loadHistory}>
            Refresh
          </button>
        </div>
      )}
      {events.map((event) => (
        <div key={event.id} className="activity-item">
          <div className="activity-icon">{getEventIcon(event.eventType)}</div>
          <div className="activity-content">
            <p className="activity-title">{formatEventTitle(event.eventType)}</p>
            <div className="activity-meta">
              <span>{timeAgo(event.timestamp)}</span>
              {isGlobalFeed && (
                <a href={`#stream-${event.streamId}`} className="muted">
                  Stream {event.streamId}
                </a>
              )}
            </div>
            <div className="muted" style={{ marginTop: "0.35rem" }}>
              {getEventDescription(event)}
            </div>
            {event.actor && (
              <div style={{ marginTop: "0.5rem" }}>
                <CopyableAddress address={event.actor} truncationMode="end" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
