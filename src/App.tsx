import { ContourProvider } from "@/providers/ContourProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { NotificationsProvider } from "@/providers/NotificationsProvider";
import { Shell } from "@/components/layout/Shell";

export default function App() {
  return (
    <ToastProvider>
      <NotificationsProvider>
        <ContourProvider>
          <Shell />
        </ContourProvider>
      </NotificationsProvider>
    </ToastProvider>
  );
}
