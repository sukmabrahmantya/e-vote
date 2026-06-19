import { useEffect, useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import { VotePage } from "./pages/VotePage";

export function App() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    function handlePopState() {
      setPath(window.location.pathname);
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(nextPath: string) {
    if (nextPath === path) return;
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }

  if (path === "/dashboard") {
    return <DashboardPage navigate={navigate} />;
  }

  return <VotePage navigate={navigate} />;
}
