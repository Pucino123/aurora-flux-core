import React, { createContext, useContext } from "react";

/**
 * Provides a per-page closeWidget function so DraggableWidget's X button
 * removes from the correct list (pageActiveWidgets) instead of global activeWidgets.
 */
const WidgetCloseContext = createContext<((id: string) => void) | null>(null);

export const WidgetCloseProvider = ({
  children,
  closeWidget,
}: {
  children: React.ReactNode;
  closeWidget: (id: string) => void;
}) => (
  <WidgetCloseContext.Provider value={closeWidget}>
    {children}
  </WidgetCloseContext.Provider>
);

/** Returns the context close function, or null if not inside a provider. */
export const useWidgetClose = () => useContext(WidgetCloseContext);
