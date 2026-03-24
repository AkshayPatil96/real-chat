import { useGetCurrentUserQuery } from "@/store/api";
import { useAuth } from "@/hooks/useAuth";
import React from "react";

type AuthProviderProps = {
  children: React.ReactNode;
};

const AuthProvider = ({ children }: AuthProviderProps) => {
  const { isTokenReady } = useAuth();
  const { status } = useGetCurrentUserQuery(
    undefined,
    { skip: !isTokenReady },
  );
  console.log("status: ", status);


  return <>{children}</>;
};

export default AuthProvider;
