import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const useQueryParam = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getQueryParam = useCallback(
    (key: string): string | null => {
      const params = new URLSearchParams(location.search);
      return params.get(key);
    },
    [location.search]
  );

  const setQueryParam = useCallback(
    (key: string, value: string): void => {
      const params = new URLSearchParams(location.search);
      params.set(key, value);
      navigate({ search: params.toString() }, { replace: true });
    },
    [location.search, navigate]
  );

  return { getQueryParam, setQueryParam };
};
