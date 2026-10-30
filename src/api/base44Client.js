import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { withBranchScope } from '@/lib/branchScope';

const { appId, serverUrl, token, functionsVersion } = appParams;

//Create a client with authentication required
const client = createClient({
  appId,
  serverUrl,
  token,
  functionsVersion,
  requiresAuth: false
});

// Multi-branch: branch-aware entities read and write through the active branch
// (see src/lib/branchScope.js), so every page — and every direct request the app
// makes — stays inside one branch without each page remembering the filter.
const scopedEntities = withBranchScope(client.entities);

export const base44 = new Proxy(client, {
  get(target, prop) {
    if (prop === 'entities') return scopedEntities;
    const value = target[prop];
    return typeof value === 'function' ? value.bind(target) : value;
  }
});