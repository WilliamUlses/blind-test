'use client';

import { useSocketListeners } from '../../hooks/useSocketListeners';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  // Le hook s'initialise ici et reste actif pendant toute la durée de l'app
  useSocketListeners();

  return <>{children}</>;
}
