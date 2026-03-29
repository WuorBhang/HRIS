import { useLocation } from "wouter";

export function useNavigate() {
  const [, navigate] = useLocation();
  return navigate;
}
