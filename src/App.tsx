import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, useTheme } from "next-themes";
import { FluxProvider } from "./context/FluxContext";
import { FocusProvider } from "./context/FocusContext";
import { AuthProvider } from "./hooks/useAuth";
import Index from "./pages/Index";
import Focus from "./pages/Focus";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";

const queryClient = new QueryClient();

/** Global Cmd+Shift+D dark-mode toggle */
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
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <FluxProvider>
          <FocusProvider>
          <TooltipProvider>
            <DarkModeShortcut />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/focus" element={<Focus />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<Index />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
          </FocusProvider>
        </FluxProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
