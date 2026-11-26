import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";

// Applicazione a schermata singola: niente router (un hash come "#WSTG-INFO-01" non deve cambiare pagina)
const App = () => (
  <TooltipProvider>
    <Index />
  </TooltipProvider>
);

export default App;
