'use client';
import { createContext, useContext } from 'react';
export type ChallengeDraft = { fields: Record<string, string>; restoreNonce: number };
export const ChallengeDraftContext = createContext<ChallengeDraft>({ fields: {}, restoreNonce: 0 });
export const useChallengeDraft = () => useContext(ChallengeDraftContext);
