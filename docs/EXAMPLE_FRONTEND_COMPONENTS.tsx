/**
 * Example React Components for User Notification System
 * 
 * This file demonstrates how to integrate the notification system
 * into a React/Next.js frontend application.
 */

import { useMutation, useQuery, gql } from '@apollo/client';
import { useState, useEffect } from 'react';

// ============================================================================
// GraphQL Queries and Mutations
// ============================================================================

const GET_ME = gql`
  query GetMe {
    me {
      id
      name
      email
      reputation
      activeJourney {
        routeIds
        lineIds
        startStopId
        endStopId
        startTime
        expectedEndTime
      }
      favoriteConnections {
        id
        name
        routeIds
        lineIds
        startStopId
        endStopId
        notifyAlways
        createdAt
      }
    }
  }
`;

const SET_ACTIVE_JOURNEY = gql`
  mutation SetActiveJourney($input: ActiveJourneyInput!) {
    userMutations {
      setActiveJourney(input: $input) {
        id
        activeJourney {
          lineIds
          startTime
          expectedEndTime
        }
      }
    }
  }
`;

const CLEAR_ACTIVE_JOURNEY = gql`
  mutation ClearActiveJourney {
    userMutations {
      clearActiveJourney {
        id
        activeJourney
      }
    }
  }
`;

const ADD_FAVORITE = gql`
  mutation AddFavorite($input: FavoriteConnectionInput!) {
    userMutations {
      addFavoriteConnection(input: $input) {
        id
        name
        lineIds
        notifyAlways
        createdAt
      }
    }
  }
`;

const REMOVE_FAVORITE = gql`
  mutation RemoveFavorite($id: ID!) {
    userMutations {
      removeFavoriteConnection(id: $id) {
        success
        message
      }
    }
  }
`;

const UPDATE_FAVORITE = gql`
  mutation UpdateFavorite($id: ID!, $input: FavoriteConnectionInput!) {
    userMutations {
      updateFavoriteConnection(id: $id, input: $input) {
        id
        name
        notifyAlways
      }
    }
  }
`;

// ============================================================================
// Component 1: Active Journey Tracker
// ============================================================================

interface Route {
  routeIds: string[];
  lineIds: string[];
  startStopId: string;
  endStopId: string;
  startStopName: string;
  endStopName: string;
  expectedDuration: number; // minutes
}

export function ActiveJourneyTracker({ route }: { route?: Route }) {
  const { data: userData } = useQuery(GET_ME);
  const [setActiveJourney, { loading: settingJourney }] = useMutation(SET_ACTIVE_JOURNEY);
  const [clearJourney, { loading: clearingJourney }] = useMutation(CLEAR_ACTIVE_JOURNEY);

  const activeJourney = userData?.me?.activeJourney;

  const handleStartTracking = async () => {
    if (!route) return;

    const startTime = new Date().toISOString();
    const expectedEndTime = new Date(
      Date.now() + route.expectedDuration * 60 * 1000
    ).toISOString();

    try {
      await setActiveJourney({
        variables: {
          input: {
            routeIds: route.routeIds,
            lineIds: route.lineIds,
            startStopId: route.startStopId,
            endStopId: route.endStopId,
            startTime,
            expectedEndTime,
          },
        },
        refetchQueries: [{ query: GET_ME }],
      });

      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🚀 Journey Tracking Started', {
          body: `Monitoring your journey from ${route.startStopName} to ${route.endStopName}`,
          icon: '/icon-tracking.png',
        });
      }
    } catch (error) {
      console.error('Failed to start journey tracking:', error);
      alert('Failed to start tracking. Please try again.');
    }
  };

  const handleStopTracking = async () => {
    try {
      await clearJourney({
        refetchQueries: [{ query: GET_ME }],
      });

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('✅ Journey Completed', {
          body: 'Journey tracking has ended',
          icon: '/icon-success.png',
        });
      }
    } catch (error) {
      console.error('Failed to stop journey tracking:', error);
    }
  };

  // Auto-end journey when expected end time is reached
  useEffect(() => {
    if (!activeJourney?.expectedEndTime) return;

    const expectedEnd = new Date(activeJourney.expectedEndTime);
    const now = new Date();
    const timeRemaining = expectedEnd.getTime() - now.getTime();

    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        handleStopTracking();
      }, timeRemaining);

      return () => clearTimeout(timer);
    }
  }, [activeJourney?.expectedEndTime]);

  if (activeJourney) {
    return (
      <div className="active-journey-tracker active">
        <div className="status">
          <span className="icon">🚍</span>
          <div>
            <h3>Active Journey</h3>
            <p>We're monitoring your route for incidents</p>
            <p className="time">
              Started: {new Date(activeJourney.startTime).toLocaleTimeString()}
            </p>
            <p className="lines">
              Lines: {activeJourney.lineIds.join(', ')}
            </p>
          </div>
        </div>
        <button
          onClick={handleStopTracking}
          disabled={clearingJourney}
          className="btn btn-danger"
        >
          {clearingJourney ? 'Stopping...' : 'End Journey'}
        </button>
      </div>
    );
  }

  return (
    <div className="active-journey-tracker inactive">
      <div className="status">
        <span className="icon">📍</span>
        <div>
          <h3>Journey Tracking</h3>
          <p>Start tracking to receive real-time incident alerts</p>
        </div>
      </div>
      <button
        onClick={handleStartTracking}
        disabled={!route || settingJourney}
        className="btn btn-primary"
      >
        {settingJourney ? 'Starting...' : 'Start Tracking'}
      </button>
    </div>
  );
}

// ============================================================================
// Component 2: Favorite Connections Manager
// ============================================================================

export function FavoriteConnectionsManager() {
  const { data: userData, refetch } = useQuery(GET_ME);
  const [addFavorite] = useMutation(ADD_FAVORITE);
  const [removeFavorite] = useMutation(REMOVE_FAVORITE);
  const [updateFavorite] = useMutation(UPDATE_FAVORITE);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const favorites = userData?.me?.favoriteConnections || [];

  const handleAddFavorite = async (connection: {
    name: string;
    routeIds: string[];
    lineIds: string[];
    startStopId: string;
    endStopId: string;
    notifyAlways: boolean;
  }) => {
    try {
      await addFavorite({
        variables: { input: connection },
        refetchQueries: [{ query: GET_ME }],
      });
      setIsAdding(false);
      alert('✅ Favorite connection added!');
    } catch (error) {
      console.error('Failed to add favorite:', error);
      alert('Failed to add favorite. Please try again.');
    }
  };

  const handleRemoveFavorite = async (id: string) => {
    if (!confirm('Are you sure you want to remove this favorite connection?')) {
      return;
    }

    try {
      await removeFavorite({
        variables: { id },
        refetchQueries: [{ query: GET_ME }],
      });
      alert('✅ Favorite connection removed');
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      alert('Failed to remove favorite. Please try again.');
    }
  };

  const handleToggleNotifications = async (
    id: string,
    currentConnection: any,
    newNotifyAlways: boolean
  ) => {
    try {
      await updateFavorite({
        variables: {
          id,
          input: {
            ...currentConnection,
            notifyAlways: newNotifyAlways,
          },
        },
        refetchQueries: [{ query: GET_ME }],
      });
      alert(`✅ Notifications ${newNotifyAlways ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to update favorite:', error);
      alert('Failed to update notifications. Please try again.');
    }
  };

  return (
    <div className="favorite-connections-manager">
      <div className="header">
        <h2>⭐ Favorite Connections</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="btn btn-primary"
        >
          + Add Favorite
        </button>
      </div>

      {favorites.length === 0 ? (
        <div className="empty-state">
          <p>No favorite connections yet</p>
          <p className="hint">
            Add your regular routes to receive notifications about incidents
            affecting them
          </p>
        </div>
      ) : (
        <div className="favorites-list">
          {favorites.map((fav: any) => (
            <div key={fav.id} className="favorite-item">
              <div className="info">
                <h3>{fav.name}</h3>
                <p className="lines">Lines: {fav.lineIds.join(', ')}</p>
                <p className="created">
                  Added: {new Date(fav.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="actions">
                <label className="notification-toggle">
                  <input
                    type="checkbox"
                    checked={fav.notifyAlways}
                    onChange={(e) =>
                      handleToggleNotifications(fav.id, fav, e.target.checked)
                    }
                  />
                  <span>Always notify</span>
                </label>

                <button
                  onClick={() => handleRemoveFavorite(fav.id)}
                  className="btn btn-danger btn-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdding && (
        <AddFavoriteModal
          onClose={() => setIsAdding(false)}
          onSave={handleAddFavorite}
        />
      )}
    </div>
  );
}

// ============================================================================
// Component 3: Add Favorite Modal
// ============================================================================

function AddFavoriteModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (connection: any) => void;
}) {
  const [name, setName] = useState('');
  const [routeIds, setRouteIds] = useState<string[]>([]);
  const [lineIds, setLineIds] = useState<string[]>([]);
  const [startStopId, setStartStopId] = useState('');
  const [endStopId, setEndStopId] = useState('');
  const [notifyAlways, setNotifyAlways] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || routeIds.length === 0 || lineIds.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    onSave({
      name,
      routeIds,
      lineIds,
      startStopId,
      endStopId,
      notifyAlways,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add Favorite Connection</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Home to Work"
              required
            />
          </div>

          <div className="form-group">
            <label>Route IDs * (comma-separated)</label>
            <input
              type="text"
              onChange={(e) =>
                setRouteIds(e.target.value.split(',').map((s) => s.trim()))
              }
              placeholder="e.g., route1, route2"
              required
            />
          </div>

          <div className="form-group">
            <label>Line IDs * (comma-separated)</label>
            <input
              type="text"
              onChange={(e) =>
                setLineIds(e.target.value.split(',').map((s) => s.trim()))
              }
              placeholder="e.g., line1, line2"
              required
            />
          </div>

          <div className="form-group">
            <label>Start Stop ID *</label>
            <input
              type="text"
              value={startStopId}
              onChange={(e) => setStartStopId(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>End Stop ID *</label>
            <input
              type="text"
              value={endStopId}
              onChange={(e) => setEndStopId(e.target.value)}
              required
            />
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={notifyAlways}
                onChange={(e) => setNotifyAlways(e.target.checked)}
              />
              Always notify me about incidents on this route
            </label>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Favorite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Component 4: Incident Notification Display
// ============================================================================

interface IncidentNotificationProps {
  incident: {
    id: string;
    title: string;
    description?: string;
    kind: string;
    incidentClass: 'CLASS_1' | 'CLASS_2';
  };
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  onDismiss: () => void;
}

export function IncidentNotification({
  incident,
  priority,
  message,
  onDismiss,
}: IncidentNotificationProps) {
  const styles = {
    CRITICAL: {
      bg: 'bg-red-500',
      icon: '🚨',
      sound: '/sounds/critical-alert.mp3',
      vibrate: [200, 100, 200, 100, 200],
    },
    HIGH: {
      bg: 'bg-orange-500',
      icon: '⚠️',
      sound: '/sounds/high-alert.mp3',
      vibrate: [100, 50, 100],
    },
    MEDIUM: {
      bg: 'bg-yellow-500',
      icon: 'ℹ️',
      sound: '/sounds/info-alert.mp3',
      vibrate: [100],
    },
    LOW: {
      bg: 'bg-gray-500',
      icon: '📌',
      sound: null,
      vibrate: null,
    },
  };

  const style = styles[priority];

  useEffect(() => {
    // Play sound
    if (style.sound) {
      const audio = new Audio(style.sound);
      audio.play().catch(() => {
        // Ignore if sound can't play
      });
    }

    // Vibrate
    if (style.vibrate && 'vibrate' in navigator) {
      navigator.vibrate(style.vibrate);
    }
  }, []);

  return (
    <div className={`incident-notification ${style.bg} ${priority.toLowerCase()}`}>
      <div className="notification-header">
        <span className="icon">{style.icon}</span>
        <h3>{message}</h3>
        <button onClick={onDismiss} className="close-btn">
          ×
        </button>
      </div>

      <div className="notification-body">
        <h4>{incident.title}</h4>
        {incident.description && <p>{incident.description}</p>}
        <p className="incident-type">Type: {incident.kind}</p>
      </div>

      <div className="notification-actions">
        <button className="btn btn-sm">View Details</button>
        {priority === 'CRITICAL' && (
          <button className="btn btn-sm btn-primary">Find Alternative Route</button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Component 5: Notification Permission Request
// ============================================================================

export function NotificationPermissionRequest() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Your browser does not support notifications');
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      new Notification('✅ Notifications Enabled', {
        body: "You'll now receive real-time incident alerts",
        icon: '/icon-success.png',
      });
    }
  };

  if (permission === 'granted') {
    return null;
  }

  return (
    <div className="notification-permission-banner">
      <span className="icon">🔔</span>
      <div>
        <h3>Enable Notifications</h3>
        <p>Get real-time alerts about incidents on your routes</p>
      </div>
      <button onClick={requestPermission} className="btn btn-primary">
        Enable
      </button>
    </div>
  );
}

// ============================================================================
// Example CSS (Tailwind or custom)
// ============================================================================

export const exampleStyles = `
.active-journey-tracker {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
}

.active-journey-tracker.active {
  border-color: #10b981;
  background: #f0fdf4;
}

.incident-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  max-width: 400px;
  padding: 16px;
  border-radius: 8px;
  color: white;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease-out;
}

.incident-notification.critical {
  animation: pulse 0.5s ease-in-out infinite;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.favorite-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 12px;
}

.notification-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}
`;
