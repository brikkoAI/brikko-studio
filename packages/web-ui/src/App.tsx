import { Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Welcome } from "./pages/Welcome.js";
import { Callback } from "./pages/Callback.js";
import { Status } from "./pages/Status.js";
import { Chat } from "./pages/Chat.js";
import { Privacy } from "./pages/Privacy.js";
import { Settings } from "./pages/Settings.js";
import { Wizard } from "./onboarding/Wizard.js";
import { NavBar } from "./components/NavBar.js";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="app">
        <NavBar />
        <main className="main">
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/callback" element={<Callback />} />
            <Route path="/status" element={<Status />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/onboarding" element={<Wizard />} />
          </Routes>
        </main>
      </div>
    </QueryClientProvider>
  );
}
