import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AgentAuthContext = createContext(null);
export const useAgentAuth = () => useContext(AgentAuthContext);

export function AgentAuthProvider({ children }) {
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("sd_agent_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/agent/me");
      setAgent(data);
    } catch (e) {
      localStorage.removeItem("sd_agent_token");
      setAgent(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = (token, agentData) => {
    localStorage.setItem("sd_agent_token", token);
    setAgent(agentData);
  };

  const logout = () => {
    localStorage.removeItem("sd_agent_token");
    setAgent(null);
  };

  return (
    <AgentAuthContext.Provider
      value={{
        agent,
        setAgent,
        loading,
        login,
        logout,
        refresh: fetchMe,
      }}
    >
      {children}
    </AgentAuthContext.Provider>
  );
}
