import { ContourProvider } from "@/providers/ContourProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { NotificationsProvider } from "@/providers/NotificationsProvider";
import { ProblemsProvider } from "@/providers/ProblemsProvider";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { Shell } from "@/components/layout/Shell";

export default function App() {
  return (
    <ToastProvider>
      <NotificationsProvider>
        <ProblemsProvider>
          <ConfirmProvider>
            <ContourProvider>
              <Shell />
            </ContourProvider>
          </ConfirmProvider>
        </ProblemsProvider>
      </NotificationsProvider>
    </ToastProvider>
  );
}
