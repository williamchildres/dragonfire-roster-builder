/* eslint-disable react-refresh/only-export-components -- the tiny router intentionally colocates its typed link and route contract */
import type { MouseEvent, ReactNode } from 'react';

export type AppRoute = 'overview' | 'roster' | 'formations' | 'optimizer' | 'about' | 'updates';

export const routePaths: Record<AppRoute, string> = {
  overview: '/overview',
  roster: '/roster',
  formations: '/formations',
  optimizer: '/optimizer',
  about: '/about',
  updates: '/updates',
};

export const routeMetadata: Record<AppRoute, { title: string }> = {
  overview: { title: 'Dragonfire Lab' },
  roster: { title: 'My Roster | Dragonfire Lab' },
  formations: { title: 'Formation Builder | Dragonfire Lab' },
  optimizer: { title: 'Roster Optimizer | Dragonfire Lab' },
  about: { title: 'About | Dragonfire Lab' },
  updates: { title: 'Updates | Dragonfire Lab' },
};

export type NavigateToRoute = (route: AppRoute, options?: { keyboard?: boolean; replace?: boolean }) => void;

const routesByPath = new Map(Object.entries(routePaths).map(([route, path]) => [path, route as AppRoute]));

export function routeFromPath(pathname: string): AppRoute | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return routesByPath.get(normalized) ?? null;
}

export function canonicalRouteFromLocation(location: Pick<Location, 'pathname' | 'hash'>): AppRoute {
  if (location.hash === '#database' || location.hash === '#dragon-database' || location.hash === '#dragons') {
    return 'roster';
  }
  if (location.hash === '#data-status') {
    return 'updates';
  }
  return routeFromPath(location.pathname) ?? 'overview';
}

export function isPlainInternalClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0
    && !event.defaultPrevented
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey
    && event.currentTarget.target !== '_blank'
    && !event.currentTarget.hasAttribute('download');
}

export function AppLink({
  route,
  navigate,
  children,
  className,
  ariaLabel,
  ariaCurrent,
}: {
  route: AppRoute;
  navigate?: NavigateToRoute;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  ariaCurrent?: 'page';
}) {
  return (
    <a
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      className={className}
      href={routePaths[route]}
      onClick={(event) => {
        if (!navigate || !isPlainInternalClick(event)) return;
        event.preventDefault();
        navigate(route, { keyboard: event.detail === 0 });
      }}
    >
      {children}
    </a>
  );
}
