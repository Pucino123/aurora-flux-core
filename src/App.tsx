import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, useTheme } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { FluxProvider } from "./context/FluxContext";
import { FocusProvider } from "./context/FocusContext";
import { AuthProvider } from "./hooks/useAuth";
import { MonetizationProvider } from "./context/MonetizationContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { CRMProvider } from "./context/CRMContext";
import { FocusModeProvider } from "./context/FocusModeContext";
import { TrashProvider } from "./context/TrashContext";
import { AvatarProvider } from "./context/AvatarContext";
import Index from "./pages/Index";
import Focus from "./pages/Focus";
import Auth from "./pages/Auth";
import CalendarCallback from "./pages/CalendarCallback";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";

const queryClient = new QueryClient();

const DarkModeShortcut = () => {
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setTheme(theme === "dark" ? "light" : "dark");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [theme, setTheme]);
  return null;
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
        <AuthProvider>
          <MonetizationProvider>
            <TrashProvider>
              <FocusModeProvider>
                <FluxProvider>
                  <AvatarProvider>
                    <WorkspaceProvider>
                      <CRMProvider>
                        <FocusProvider>
                          <TooltipProvider>
                            <DarkModeShortcut />
                            <Toaster />
                            <Sonner />
                            <BrowserRouter>
                              <Routes>
                                <Route path="/focus" element={<Focus />} />
                                <Route path="/auth" element={<Auth />} />
                                <Route path="/calendar" element={<CalendarCallback />} />
                                <Route path="/" element={<Index />} />
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </BrowserRouter>
                          </TooltipProvider>
                        </FocusProvider>
                      </CRMProvider>
                    </WorkspaceProvider>
                  </AvatarProvider>
                </FluxProvider>
              </FocusModeProvider>
            </TrashProvider>
          </MonetizationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
