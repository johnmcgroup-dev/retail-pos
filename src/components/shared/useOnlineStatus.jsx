// App is online-only — always reports connected so all data comes from the server.
export function useOnlineStatus() {
  return { isOnline: true, wasOffline: false };
}