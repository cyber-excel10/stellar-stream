import { useEffect, useState, useCallback } from "react";
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

export function StreamTimeline({ streamId }: StreamTimelineProps) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (streamId) {
        const data = await getStreamHistory(streamId);
        setEvents(data);
      } else {
        const data = await listAllEvents();
        setEvents(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function getEventIcon(eventType: string): string {
    switch (eventType) {
      case "created":
        return "✨";
      case "claimed":
        return "💰";
      case "canceled":
        return "⏹️";
      case "start_time_updated":
        return "⏰";
      default:
        return "📝";
    }
  }

  function getEventDescription(event: StreamEvent): React.ReactNode {
    const actor = event.actor ? (
      <CopyableAddress address={event.actor} />
    ) : (
      "Unknown"
    );
    switch (event.eventType) {
      case "created":
        return (
          <>
            Initiated by {actor} for {event.amount} tokens
          </>
        );
      case "claimed":
        return (
          <>
            Claim of {event.amount} tokens processed by {actor}
          </>
        );
      case "canceled":
        return <>Closed by {actor}</>;
      case "start_time_updated":
        return <>New start time set by {actor}</>;
      default:
        return <>Action performed by {actor}</>;
    }
  }

  if (loading) {
    return (
      <div className="muted" style={{ padding: "1rem" }}>
        Loading activity history...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="activity-error"
        style={{ color: "var(--color-text-error)", padding: "1rem" }}
      >
        ⚠️ {error}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="muted" style={{ padding: "1rem" }}>
        No events found for this stream.
      </div>
    );
  }

  return (
    <div className="activity-feed">
      {events.map((event) => (
        <div key={event.id} className="activity-item">
          <div className="activity-icon">{getEventIcon(event.eventType)}</div>
          <div className="activity-content">
            <div className="activity-desc">{getEventDescription(event)}</div>
            <div className="muted">{timeAgo(event.timestamp)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
