import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as api from "../api";

const ApiContext = createContext(null);

export function ApiProvider({ children }) {
  const [apis, setApis] = useState([]);
  const [selectedApiId, setSelectedApiId] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.listApis();
      setApis(data || []);
      setSelectedApiId((prev) => {
        if (prev && data.some((a) => a._id === prev)) return prev;
        return data[0]?._id || null;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectedApi = apis.find((a) => a._id === selectedApiId) || null;

  return (
    <ApiContext.Provider
      value={{ apis, loading, selectedApiId, setSelectedApiId, selectedApi, refresh }}
    >
      {children}
    </ApiContext.Provider>
  );
}

export const useApis = () => useContext(ApiContext);
