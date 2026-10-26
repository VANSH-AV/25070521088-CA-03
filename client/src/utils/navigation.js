export function isMyProjectsRoute(pathname = '') {
  return /^\/(?:dashboard\/projects|projects\/(?:new|[^/]+\/edit))\/?$/.test(pathname);
}
