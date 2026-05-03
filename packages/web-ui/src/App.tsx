import { Routes, Route } from "react-router-dom";
import { Welcome } from "./pages/Welcome.js";
import { Callback } from "./pages/Callback.js";
import { Status } from "./pages/Status.js";

export function App() {
  return (
    <div className="shell">
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/status" element={<Status />} />
      </Routes>
    </div>
  );
}
