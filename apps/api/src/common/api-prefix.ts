/**
 * Single source of truth for the global route prefix — matches the
 * production reverse proxy's path-based routing (see README's deployment
 * notes). Every place that needs to know the API's actual mounted path
 * imports this instead of hardcoding 'api/v1', specifically because
 * hardcoding it in more than one place is exactly how this broke twice
 * already: the refresh-token cookie's path (auth.controller.ts) and the
 * static /uploads mount (main.ts) were both left pointing at their
 * pre-prefix paths when app.setGlobalPrefix() was first added, breaking
 * silent login refresh and every uploaded image respectively.
 */
export const API_PREFIX = 'api/v1';
