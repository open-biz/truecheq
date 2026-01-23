import LandingPage from "@/components/LandingPage";
import { Toaster } from "@/components/ui/sonner";

export default function Home() {
  return (
    <main>
      <LandingPage />
      <Toaster position="bottom-right" theme="dark" richColors />
    </main>
  );
}