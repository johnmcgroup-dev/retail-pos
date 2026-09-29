import { QueryClient } from '@tanstack/react-query';
import { isRateLimitError } from '@/lib/requestRetry';

// Cache-wide methods in this React Query version expect a filter object
// ({ queryKey: [...] }). The app calls them with a bare key array, which the
// library reads as "no filter" and therefore matches EVERY cached query — so a
// single save used to refetch the whole app at once and trip the API's rate
// limit. Normalising the array form to a precise filter means only the queries
// that actually changed are refetched.
const FILTER_METHODS = [
	'invalidateQueries',
	'refetchQueries',
	'removeQueries',
	'resetQueries',
	'cancelQueries',
];

const normaliseFilters = (filters) => (Array.isArray(filters) ? { queryKey: filters } : filters ?? {});

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			// Reads are safe to repeat, so a throttled fetch retries in the
			// background instead of surfacing an error.
			retry: (failureCount, error) => (isRateLimitError(error) ? failureCount < 3 : failureCount < 1),
			retryDelay: (attempt, error) => (isRateLimitError(error) ? Math.min(800 * 2 ** attempt, 6000) : 800),
		},
	},
});

FILTER_METHODS.forEach((method) => {
	const original = queryClientInstance[method].bind(queryClientInstance);
	queryClientInstance[method] = (filters, options) => original(normaliseFilters(filters), options);
});