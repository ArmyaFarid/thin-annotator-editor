import {QueryClient} from "@tanstack/react-query";

// Defaults tuned for a single-user app talking to a backend on loopback.
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Required. The default (true) would refetch task/load when the
            // window regains focus, which re-triggers the restore-annotations
            // modal in the middle of a session.
            refetchOnWindowFocus: false,
            // Nothing changes server-side: one user owns the data and this
            // client is the only writer.
            staleTime: Infinity,
            // One retry covers the case that actually happens locally — the
            // Python service not yet listening when the UI loads.
            retry: 1,
        },
        // Mutations keep the default of no retry: saving twice is worse than
        // failing once and telling the user.
    },
});
