import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { StoreProvider } from "./store/StoreProvider";
import { ThemeProvider } from "./components/providers/theme-provider";
import { ClientProviders } from "./components/providers/ClientProviders";
import { AppRoutes } from "./routes";
import { SocketProvider } from "./contexts/SocketContext";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <BrowserRouter>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <StoreProvider>
            <SocketProvider>
              <ClientProviders>
                <AppRoutes />
              </ClientProviders>
            </SocketProvider>
          </StoreProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ClerkProvider>
  );
}

export default App;
