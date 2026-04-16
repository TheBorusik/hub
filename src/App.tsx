import { ContourProvider } from "@/providers/ContourProvider";
import { Shell } from "@/components/layout/Shell";

export default function App() {
  return (
    <ContourProvider>
      <Shell />
    </ContourProvider>
  );
}
