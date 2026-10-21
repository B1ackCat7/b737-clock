export function browserSupport({ secure = globalThis.isSecureContext, serial = globalThis.navigator?.serial, policy = globalThis.document?.permissionsPolicy || globalThis.document?.featurePolicy } = {}) {
  if (!secure) return { ready: false, message: 'USB requires HTTPS or localhost. Open the hosted portal or start the local Mac launcher.' };
  if (!serial) return { ready: false, message: 'This browser does not expose Web Serial. Open the portal in desktop Chrome or Edge on your Mac.' };
  if (policy?.allowsFeature && !policy.allowsFeature('serial')) return { ready: false, message: 'This page or its embedding frame blocks serial access. Open the website directly in a full Chrome/Edge tab, or use the local Mac launcher.' };
  return { ready: true, message: 'Browser USB access is available. The clock must be selected and identified before writing.' };
}
export function connectionError(error) {
  if (error.name === 'NotFoundError') return 'No serial port was selected. If the chooser is empty, confirm the clock is connected and try “Show all serial ports”; select only your clock’s USB port. If the chooser closes immediately, try Connect yourself in a regular browser tab.';
  if (error.name === 'SecurityError' || error.name === 'NotAllowedError') return 'The browser denied serial permission. Open this site directly in desktop Chrome/Edge, allow its serial-device request, and check the site’s serial permissions.';
  return error.message;
}
